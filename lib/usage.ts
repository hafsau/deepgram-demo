import { percentile } from "@/lib/engine";

/*
 * Synthetic request log for one project, Oct 1–14 2026. Prices follow public
 * pay-as-you-go rates (per minute for STT and agents, per 1K characters for
 * TTS). Latency is time to first result (STT), first byte (TTS) or first
 * agent audio (agents).
 */

export type Product = "Speech-to-text" | "Text-to-speech" | "Voice Agent";
export type Req = {
  id: string;
  at: string; // ISO
  product: Product;
  model: string;
  mode: "streaming" | "prerecorded" | "rest" | "websocket";
  units: number; // seconds of audio, or characters
  latencyMs: number;
  status: 200 | 400 | 401 | 429;
  cost: number;
  tags: string[];
};

const MODELS: { product: Product; model: string; mode: Req["mode"]; weight: number; unit: [number, number]; lat: [number, number]; price: number; per: "min" | "kchar" }[] = [
  { product: "Speech-to-text", model: "flux-general-en", mode: "streaming", weight: 0.3, unit: [20, 240], lat: [180, 70], price: 0.0065, per: "min" },
  { product: "Speech-to-text", model: "nova-3", mode: "prerecorded", weight: 0.25, unit: [60, 1800], lat: [900, 400], price: 0.0043, per: "min" },
  { product: "Text-to-speech", model: "flux-kit-en", mode: "websocket", weight: 0.15, unit: [80, 900], lat: [95, 30], price: 0.045, per: "kchar" },
  { product: "Text-to-speech", model: "aura-2-thalia-en", mode: "rest", weight: 0.1, unit: [80, 900], lat: [210, 60], price: 0.03, per: "kchar" },
  { product: "Voice Agent", model: "agent (flux + gpt-4o-mini)", mode: "websocket", weight: 0.2, unit: [30, 420], lat: [780, 260], price: 0.075, per: "min" },
];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

export const REQUESTS: Req[] = (() => {
  const r = rng(42);
  const out: Req[] = [];
  for (let day = 1; day <= 14; day++) {
    const n = 18 + Math.floor(r() * 10) + day;
    for (let k = 0; k < n; k++) {
      let x = r();
      const m = MODELS.find((mm) => (x -= mm.weight) < 0) ?? MODELS[0];
      const units = Math.round(m.unit[0] + r() * (m.unit[1] - m.unit[0]));
      // Right-skewed latency: base plus a long tail.
      const latencyMs = Math.round(m.lat[0] + m.lat[1] * (r() * 1.2 + (r() < 0.08 ? 3 + r() * 4 : 0)));
      const sx = r();
      const status: Req["status"] = sx < 0.012 ? 429 : sx < 0.022 ? 400 : sx < 0.026 ? 401 : 200;
      const cost = status === 200 ? (m.per === "min" ? (units / 60) * m.price : (units / 1000) * m.price) : 0;
      const hour = 8 + Math.floor(r() * 12);
      const min = Math.floor(r() * 60);
      out.push({
        id: `req_${day.toString().padStart(2, "0")}${k.toString().padStart(3, "0")}`,
        at: `2026-10-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00Z`,
        product: m.product,
        model: m.model,
        mode: m.mode,
        units,
        latencyMs,
        status,
        cost: Math.round(cost * 10000) / 10000,
        tags: [r() < 0.7 ? "prod" : "staging"],
      });
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
})();

export const CREDIT = 200;
export const TODAY = 14;
export const DAYS_IN_MONTH = 31;

export function spend(reqs: Req[] = REQUESTS) {
  const used = Math.round(reqs.reduce((n, q) => n + q.cost, 0) * 100) / 100;
  const perDay = used / TODAY;
  const projected = Math.round(perDay * DAYS_IN_MONTH * 100) / 100;
  const daysLeft = perDay > 0 ? Math.floor((CREDIT - used) / perDay) : Infinity;
  return { used, perDay: Math.round(perDay * 100) / 100, projected, daysLeft };
}

export function latencyByModel(reqs: Req[] = REQUESTS) {
  const models = [...new Set(reqs.map((r) => r.model))];
  return models.map((model) => {
    const rs = reqs.filter((r) => r.model === model);
    const ok = rs.filter((r) => r.status === 200).map((r) => r.latencyMs);
    return {
      model,
      product: rs[0].product,
      requests: rs.length,
      p50: percentile(ok, 50),
      p95: percentile(ok, 95),
      max: Math.max(...ok),
      errorRate: Math.round(((rs.length - ok.length) / rs.length) * 1000) / 10,
      cost: Math.round(rs.reduce((n, q) => n + q.cost, 0) * 100) / 100,
    };
  });
}

export function unitLabel(q: Req): string {
  return q.product === "Text-to-speech" ? `${q.units.toLocaleString()} chars` : `${Math.floor(q.units / 60)}m ${q.units % 60}s`;
}
