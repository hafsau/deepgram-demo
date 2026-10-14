import { DEFAULT_CONFIG, LIMITS, type Config, type ListenModel, type LlmModel, type Voice } from "@/lib/engine";
import { SESSION_BY_ID } from "@/lib/sessions";

/*
 * Shareable config URLs: only non-default values go in the query string, and
 * every value is validated and clamped on the way back in, so a hand-edited
 * link can't put the playground in an impossible state.
 */

const LISTEN: ListenModel[] = ["flux", "nova-3"];
const LLMS: LlmModel[] = ["gpt-4o-mini", "gpt-4.1", "claude-haiku"];
const VOICES: Voice[] = ["flux-kit-en", "aura-2-thalia-en"];

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

export function toQuery(cfg: Config): string {
  const q = new URLSearchParams();
  const d = DEFAULT_CONFIG;
  if (cfg.session !== d.session) q.set("s", cfg.session);
  if (cfg.listen !== d.listen) q.set("listen", cfg.listen);
  if (cfg.eot !== d.eot) q.set("eot", String(cfg.eot));
  if (cfg.eager !== null) q.set("eager", String(cfg.eager));
  if (cfg.timeoutMs !== d.timeoutMs) q.set("timeout", String(cfg.timeoutMs));
  if (cfg.endpointingMs !== d.endpointingMs) q.set("endpointing", String(cfg.endpointingMs));
  if (cfg.llm !== d.llm) q.set("llm", cfg.llm);
  if (cfg.voice !== d.voice) q.set("voice", cfg.voice);
  if (cfg.speed !== d.speed) q.set("speed", String(cfg.speed));
  return q.toString();
}

export function fromQuery(input: string | URLSearchParams): Config {
  const q = typeof input === "string" ? new URLSearchParams(input) : input;
  const cfg: Config = { ...DEFAULT_CONFIG };
  const s = q.get("s");
  if (s && SESSION_BY_ID[s]) cfg.session = s;
  const listen = q.get("listen") as ListenModel | null;
  if (listen && LISTEN.includes(listen)) cfg.listen = listen;
  const num = (k: string) => {
    const v = q.get(k);
    if (v === null || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const eot = num("eot");
  if (eot !== null) cfg.eot = r2(clamp(eot, LIMITS.eot));
  const eager = num("eager");
  if (eager !== null) cfg.eager = r2(Math.min(clamp(eager, LIMITS.eager), cfg.eot));
  const timeout = num("timeout");
  if (timeout !== null) cfg.timeoutMs = Math.round(clamp(timeout, LIMITS.timeoutMs));
  const ep = num("endpointing");
  if (ep !== null) cfg.endpointingMs = Math.round(clamp(ep, LIMITS.endpointingMs));
  const llm = q.get("llm") as LlmModel | null;
  if (llm && LLMS.includes(llm)) cfg.llm = llm;
  const voice = q.get("voice") as Voice | null;
  if (voice && VOICES.includes(voice)) cfg.voice = voice;
  const speed = num("speed");
  if (speed !== null) cfg.speed = r2(clamp(speed, LIMITS.speed));
  return cfg;
}
