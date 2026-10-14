import type { Exchange, Session, Word } from "@/lib/sessions";

/*
 * Replay engine. Given a recorded session and a configuration, compute when
 * each user turn is judged complete, what the agent did and when, and a
 * per-turn latency report shaped like the Voice Agent API's LatencyReport
 * (stt_latency, ttt_token_latency, ttt_text_latency, ttt_tool_latency,
 * tts_latency, total_latency; seconds).
 *
 * Turn detection:
 *  - Flux: an end-of-turn confidence curve; EndOfTurn fires when it crosses
 *    eot_threshold, or eot_timeout_ms after speech. With eager_eot_threshold,
 *    the agent starts thinking early and releases audio on confirmation.
 *  - Nova-3: a silence timer (endpointing). Any pause longer than it ends the turn.
 *
 * Component timings (STT finalize, TTS first byte, LLM factors) are
 * illustrative, chosen to be plausible, and labelled as such in the UI.
 */

export type ListenModel = "flux" | "nova-3";
export type LlmModel = "gpt-4o-mini" | "gpt-4.1" | "claude-haiku";
export type Voice = "flux-kit-en" | "aura-2-thalia-en";

export type Config = {
  session: string;
  listen: ListenModel;
  eot: number;
  eager: number | null;
  timeoutMs: number;
  endpointingMs: number;
  llm: LlmModel;
  voice: Voice;
  speed: number;
};

export const DEFAULT_CONFIG: Config = {
  session: "pizza",
  listen: "flux",
  eot: 0.7,
  eager: null,
  timeoutMs: 5000,
  endpointingMs: 700,
  llm: "gpt-4o-mini",
  voice: "flux-kit-en",
  speed: 1,
};

export const LIMITS = {
  eot: [0.5, 1.0],
  eager: [0.3, 0.9],
  timeoutMs: [500, 10000],
  endpointingMs: [100, 2000],
  speed: [0.7, 1.5],
} as const;

export const LISTEN_LABEL: Record<ListenModel, string> = { flux: "Flux (flux-general-en)", "nova-3": "Nova-3 (nova-3)" };
export const LLM_LABEL: Record<LlmModel, string> = { "gpt-4o-mini": "OpenAI gpt-4o-mini", "gpt-4.1": "OpenAI gpt-4.1", "claude-haiku": "Anthropic Claude Haiku" };
export const VOICE_LABEL: Record<Voice, string> = { "flux-kit-en": "Flux TTS · Kit", "aura-2-thalia-en": "Aura-2 · Thalia" };

const LLM_FACTOR: Record<LlmModel, number> = { "gpt-4o-mini": 1, "gpt-4.1": 1.45, "claude-haiku": 1.15 };
const TTS_TTFB: Record<Voice, number> = { "flux-kit-en": 0.09, "aura-2-thalia-en": 0.2 };
const STT_FINAL: Record<ListenModel, number> = { flux: 0.06, "nova-3": 0.14 };
const TOOL_EXEC = 0.25;
const AFTER_TOOL_LLM = 0.3;
const VAD_DELAY = 0.15;
const FLUSH_DELAY = 0.2;
const STEP = 0.01;

/* ---------- End-of-turn confidence ---------- */

const BASE = 0.08;

/** End-of-turn confidence at time t (seconds from the start of the user's turn). */
export function eotConfidence(words: Word[], t: number): number {
  if (!words.length || t < words[0].s) return 0.05;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (t >= w.s && t <= w.e) return 0.06;
    const next = words[i + 1];
    if (t > w.e && (!next || t < next.s)) {
      const c = w.done ?? 0.12;
      const dt = t - w.e;
      let p = BASE + (c - BASE) * (1 - Math.exp(-dt / 0.18));
      if (!next) p += Math.min(0.15, 0.04 * Math.max(0, dt - 1.2));
      return Math.min(0.99, p);
    }
  }
  return 0.05;
}

/** First time in [from, to] where confidence reaches threshold, or null. */
export function firstCrossing(words: Word[], threshold: number, from: number, to: number): number | null {
  for (let t = from; t <= to + 1e-9; t += STEP) {
    if (eotConfidence(words, t) >= threshold) return round(t);
  }
  return null;
}

/** Pauses between words: [start, end] in seconds from turn start. */
export function pauses(words: Word[]): { i: number; s: number; e: number }[] {
  const out: { i: number; s: number; e: number }[] = [];
  for (let i = 0; i < words.length - 1; i++) out.push({ i, s: words[i].e, e: words[i + 1].s });
  return out;
}

/* ---------- Turn analysis ---------- */

export type TurnDetection = {
  lastEnd: number;
  /** When the turn was confirmed complete, after the user really finished. */
  finalEot: number;
  timedOut: boolean;
  /** Set when the detector fired mid-utterance: index of the last word heard before the cut. */
  premature: { at: number; afterWord: number } | null;
  /** Flux eager end-of-turn on the final pause. */
  eagerAt: number | null;
  /** Eager fires that were followed by more speech (wasted speculative LLM calls). */
  wastedEager: number;
};

export function detectTurn(words: Word[], cfg: Config): TurnDetection {
  const lastEnd = words[words.length - 1].e;
  if (cfg.listen === "nova-3") {
    const ep = cfg.endpointingMs / 1000;
    const cut = pauses(words).find((p) => p.e - p.s >= ep);
    return { lastEnd, finalEot: round(lastEnd + ep), timedOut: false, premature: cut ? { at: round(cut.s + ep), afterWord: cut.i } : null, eagerAt: null, wastedEager: 0 };
  }
  const timeout = cfg.timeoutMs / 1000;
  let premature: TurnDetection["premature"] = null;
  let wastedEager = 0;
  for (const p of pauses(words)) {
    const hit = firstCrossing(words, cfg.eot, p.s + STEP, p.e - STEP);
    if (hit !== null && !premature) premature = { at: hit, afterWord: p.i };
    if (cfg.eager !== null && firstCrossing(words, cfg.eager, p.s + STEP, p.e - STEP) !== null) wastedEager++;
  }
  const hit = firstCrossing(words, cfg.eot, lastEnd + STEP, lastEnd + timeout);
  const finalEot = hit ?? round(lastEnd + timeout);
  const eagerAt = cfg.eager !== null ? firstCrossing(words, Math.min(cfg.eager, cfg.eot), lastEnd + STEP, finalEot) : null;
  return { lastEnd, finalEot, timedOut: hit === null, premature, eagerAt, wastedEager };
}

/* ---------- Latency ---------- */

export type LatencyReport = {
  type: "LatencyReport";
  stt_latency: number;
  ttt_token_latency: number;
  ttt_text_latency: number;
  ttt_tool_latency?: number;
  tts_latency: number;
  total_latency: number;
};

export type Stage = { key: "turn" | "stt" | "llm" | "tool" | "tts" | "hold"; label: string; from: number; to: number };

export type TurnResult = {
  index: number;
  exchange: Exchange;
  detection: TurnDetection;
  report: LatencyReport;
  /** Stages relative to the end of the user's speech (0 = last word ends). May overlap. */
  stages: Stage[];
  /** Absolute session times. */
  abs: { userStart: number; lastEnd: number; finalEot: number; firstAudio: number; audioEnd: number; flushedAt: number | null };
  /** Fraction of the agent's reply audio that played before being interrupted (1 = all). */
  heard: number;
  agentText: string;
};

function pipeline(ex: Exchange, d: TurnDetection, cfg: Config) {
  const stt = STT_FINAL[cfg.listen];
  const f = LLM_FACTOR[cfg.llm];
  const llm = ex.agent.llm * f;
  const tts = TTS_TTFB[cfg.voice];
  const start = d.eagerAt ?? d.finalEot; // when the LLM is first asked
  const llmStart = start + stt;
  const confirmed = d.finalEot + stt;
  let toolDispatch: number | null = null;
  let textFirst: number;
  if (ex.agent.tool) {
    const emitted = llmStart + llm;
    toolDispatch = ex.agent.tool.defer ? Math.max(emitted, confirmed) : emitted;
    textFirst = toolDispatch + TOOL_EXEC + AFTER_TOOL_LLM * f;
  } else {
    textFirst = llmStart + llm;
  }
  const audioReady = textFirst + tts;
  const firstAudio = Math.max(audioReady, confirmed);
  return { stt, llm, tts, llmStart, confirmed, toolDispatch, textFirst, audioReady, firstAudio };
}

export function simulate(session: Session, cfg: Config) {
  const turns: TurnResult[] = [];
  const greetStart = 0.3;
  let prevAudioStart = greetStart;
  let prevAudioEnd = greetStart + session.greeting.speak / cfg.speed;
  let greetingHeard = 1;
  let prevTurn: TurnResult | null = null;

  session.exchanges.forEach((ex, index) => {
    let userStart = prevAudioEnd + ex.gap;
    let flushedAt: number | null = null;
    if (ex.gap < 0) {
      userStart = Math.max(prevAudioStart + 0.5, userStart);
      flushedAt = userStart + FLUSH_DELAY;
      const frac = Math.min(1, (flushedAt - prevAudioStart) / (prevAudioEnd - prevAudioStart));
      if (prevTurn) {
        prevTurn.heard = frac;
        prevTurn.abs.audioEnd = flushedAt;
        prevTurn.abs.flushedAt = flushedAt;
      } else greetingHeard = frac;
    }
    const d = detectTurn(ex.words, cfg);
    const p = pipeline(ex, d, cfg);
    const rel = (t: number) => round(t - d.lastEnd);
    const stages: Stage[] = [
      { key: "turn", label: cfg.listen === "flux" ? "End-of-turn detection" : "Endpointing silence", from: 0, to: rel(d.finalEot) },
      { key: "stt", label: "Transcript final", from: rel(d.finalEot), to: rel(p.confirmed) },
      { key: "llm", label: "LLM first token", from: rel(p.llmStart), to: rel(p.llmStart + p.llm) },
    ];
    if (p.toolDispatch !== null) stages.push({ key: "tool", label: ex.agent.tool!.defer ? "Tool (held to end of turn)" : "Tool call", from: rel(p.toolDispatch), to: rel(p.textFirst) });
    stages.push({ key: "tts", label: "TTS first byte", from: rel(p.textFirst), to: rel(p.audioReady) });
    if (p.audioReady < p.confirmed) stages.push({ key: "hold", label: "Held for turn confirmation", from: rel(p.audioReady), to: rel(p.confirmed) });

    const report: LatencyReport = {
      type: "LatencyReport",
      stt_latency: round(p.stt),
      ttt_token_latency: round(p.llm),
      ttt_text_latency: round(p.textFirst - p.llmStart),
      ...(p.toolDispatch !== null ? { ttt_tool_latency: round(p.llm) } : {}),
      tts_latency: round(p.tts),
      total_latency: round(p.firstAudio - d.lastEnd),
    };

    const firstAudio = round(userStart + p.firstAudio);
    const result: TurnResult = {
      index,
      exchange: ex,
      detection: d,
      report,
      stages,
      abs: { userStart: round(userStart), lastEnd: round(userStart + d.lastEnd), finalEot: round(userStart + d.finalEot), firstAudio, audioEnd: round(firstAudio + ex.agent.speak / cfg.speed), flushedAt: null },
      heard: 1,
      agentText: ex.agent.text,
    };
    turns.push(result);
    prevTurn = result;
    prevAudioStart = result.abs.firstAudio;
    prevAudioEnd = result.abs.audioEnd;
  });

  const totals = turns.map((t) => t.report.total_latency);
  const duration = round(turns.length ? turns[turns.length - 1].abs.audioEnd : prevAudioEnd);
  return {
    turns,
    greeting: { start: greetStart, end: round(greetStart + (session.greeting.speak / cfg.speed) * greetingHeard), heard: greetingHeard },
    duration,
    summary: {
      p50: percentile(totals, 50),
      p95: percentile(totals, 95),
      cutEarly: turns.filter((t) => t.detection.premature).length,
      timedOut: turns.filter((t) => t.detection.timedOut).length,
      wastedLlm: turns.reduce((n, t) => n + t.detection.wastedEager, 0),
      interruptions: turns.filter((t) => t.heard < 1).length + (greetingHeard < 1 ? 1 : 0),
    },
  };
}

export type Simulation = ReturnType<typeof simulate>;

/** Nearest-rank percentile. */
export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

export function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/* ---------- Events (Voice Agent API message names) ---------- */

export type AgentEvent = { t: number; type: string; detail?: string; payload: Record<string, unknown> };

export function events(session: Session, sim: Simulation, cfg: Config): AgentEvent[] {
  const ev: AgentEvent[] = [
    { t: 0, type: "Welcome", payload: { type: "Welcome", request_id: "demo-0000-0000" } },
    { t: 0.05, type: "SettingsApplied", payload: { type: "SettingsApplied" } },
    { t: 0.2, type: "ConversationText", detail: "assistant", payload: { type: "ConversationText", role: "assistant", content: session.greeting.text } },
    { t: sim.greeting.start, type: "AgentStartedSpeaking", payload: { type: "AgentStartedSpeaking" } },
  ];
  sim.turns.forEach((t) => {
    const u = t.abs.userStart;
    ev.push({ t: round(u + VAD_DELAY), type: "UserStartedSpeaking", payload: { type: "UserStartedSpeaking" } });
    const transcript = t.exchange.words.map((w) => w.w).join(" ");
    ev.push({ t: round(t.abs.finalEot + STT_FINAL[cfg.listen]), type: "ConversationText", detail: "user", payload: { type: "ConversationText", role: "user", content: transcript } });
    if (t.exchange.agent.tool) {
      const toolStage = t.stages.find((s) => s.key === "tool")!;
      ev.push({ t: round(t.abs.lastEnd + toolStage.from), type: "FunctionCallRequest", detail: t.exchange.agent.tool.name, payload: { type: "FunctionCallRequest", functions: [{ id: `fn_${t.index + 1}`, name: t.exchange.agent.tool.name, arguments: JSON.stringify(t.exchange.agent.tool.args), client_side: true }] } });
    }
    ev.push({ t: round(t.abs.firstAudio - 0.02), type: "ConversationText", detail: "assistant", payload: { type: "ConversationText", role: "assistant", content: t.agentText } });
    ev.push({ t: t.abs.firstAudio, type: "AgentStartedSpeaking", payload: { type: "AgentStartedSpeaking" } });
    ev.push({ t: round(t.abs.firstAudio + 0.01), type: "LatencyReport", payload: { ...t.report } });
    ev.push({ t: t.abs.audioEnd, type: "AgentAudioDone", detail: t.heard < 1 ? "interrupted" : undefined, payload: { type: "AgentAudioDone" } });
  });
  return ev.sort((a, b) => a.t - b.t);
}
