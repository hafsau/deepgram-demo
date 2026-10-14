import { describe, expect, it } from "vitest";
import { code, settingsMessage } from "@/lib/code";
import { contrast } from "@/lib/contrast";
import { callsOnFreeCredit, sessionCost } from "@/lib/cost";
import { DEFAULT_CONFIG, detectTurn, eotConfidence, events, percentile, simulate, type Config } from "@/lib/engine";
import { capabilities, excess, maskKey, missing } from "@/lib/keys";
import { SESSION_BY_ID, SESSIONS } from "@/lib/sessions";
import { fromQuery, toQuery } from "@/lib/share";
import { latencyByModel, REQUESTS, spend } from "@/lib/usage";

const cfg = (p: Partial<Config> = {}): Config => ({ ...DEFAULT_CONFIG, ...p });
const pizza = SESSION_BY_ID.pizza;

describe("end-of-turn confidence", () => {
  it("is low while words are spoken and rises in pauses toward the boundary's completeness", () => {
    const w = pizza.exchanges[0].words;
    expect(eotConfidence(w, (w[0].s + w[0].e) / 2)).toBeLessThan(0.1);
    const last = w[w.length - 1];
    expect(eotConfidence(w, last.e + 1)).toBeGreaterThan(0.9);
  });
});

describe("turn detection", () => {
  it("default Flux cuts the hesitant pizza order after “large”", () => {
    const d = detectTurn(pizza.exchanges[0].words, cfg());
    expect(d.premature?.afterWord).toBe(6);
    expect(pizza.exchanges[0].words[6].w).toBe("large");
  });
  it("a higher threshold waits it out, at the cost of latency", () => {
    const lo = simulate(pizza, cfg({ eot: 0.7 }));
    const hi = simulate(pizza, cfg({ eot: 0.9 }));
    expect(hi.summary.cutEarly).toBe(0);
    expect(hi.summary.p50).toBeGreaterThan(lo.summary.p50);
  });
  it("Nova-3 ends turns on silence; shorter endpointing cuts more people off", () => {
    const long = simulate(pizza, cfg({ listen: "nova-3", endpointingMs: 1000 }));
    const short = simulate(pizza, cfg({ listen: "nova-3", endpointingMs: 300 }));
    expect(short.summary.cutEarly).toBeGreaterThan(long.summary.cutEarly);
  });
  it("eot_timeout_ms forces a turn end when confidence never gets there", () => {
    const d = detectTurn(pizza.exchanges[0].words, cfg({ eot: 1.0, timeoutMs: 1500 }));
    expect(d.timedOut).toBe(true);
    expect(d.finalEot).toBeCloseTo(d.lastEnd + 1.5, 2);
  });
});

describe("latency", () => {
  it("eager end-of-turn lowers latency but spends wasted LLM calls", () => {
    const base = simulate(pizza, cfg());
    const eager = simulate(pizza, cfg({ eager: 0.5 }));
    expect(eager.summary.p50).toBeLessThan(base.summary.p50);
    expect(eager.summary.wastedLlm).toBeGreaterThan(0);
  });
  it("audio is never released before the turn is confirmed", () => {
    for (const s of SESSIONS) {
      const sim = simulate(s, cfg({ eager: 0.4 }));
      for (const t of sim.turns) expect(t.abs.firstAudio).toBeGreaterThanOrEqual(t.abs.finalEot);
    }
  });
  it("deferred tools wait for end of turn", () => {
    const t = simulate(pizza, cfg({ eager: 0.4 })).turns[2];
    const tool = t.stages.find((s) => s.key === "tool")!;
    const turn = t.stages.find((s) => s.key === "turn")!;
    expect(tool.from).toBeGreaterThanOrEqual(turn.to);
  });
  it("LatencyReport has the API's field names and total = first audio − end of speech", () => {
    const t = simulate(pizza, cfg()).turns[1];
    expect(Object.keys(t.report)).toEqual(expect.arrayContaining(["type", "stt_latency", "ttt_token_latency", "ttt_text_latency", "tts_latency", "total_latency"]));
    expect(t.report.total_latency).toBeCloseTo(t.abs.firstAudio - t.abs.lastEnd, 2);
  });
  it("percentiles use nearest rank", () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
    expect(percentile([1, 2, 3, 4], 95)).toBe(4);
    expect(percentile([], 50)).toBe(0);
  });
  it("barge-in flushes the agent and records how much was heard", () => {
    const sim = simulate(SESSION_BY_ID.support, cfg());
    expect(sim.summary.interruptions).toBeGreaterThan(0);
    expect(sim.turns[0].heard).toBeLessThan(1);
    expect(sim.turns[0].abs.flushedAt).not.toBeNull();
  });
  it("events use Voice Agent message names and are time-ordered", () => {
    const sim = simulate(pizza, cfg());
    const ev = events(pizza, sim, cfg());
    expect(ev[0].type).toBe("Welcome");
    expect(ev.map((e) => e.type)).toEqual(expect.arrayContaining(["SettingsApplied", "UserStartedSpeaking", "ConversationText", "FunctionCallRequest", "AgentStartedSpeaking", "LatencyReport", "AgentAudioDone"]));
    for (let i = 1; i < ev.length; i++) expect(ev[i].t).toBeGreaterThanOrEqual(ev[i - 1].t);
  });
});

describe("share links", () => {
  it("round-trips any config, writing only non-defaults", () => {
    expect(toQuery(DEFAULT_CONFIG)).toBe("");
    const c = cfg({ session: "clinic", eot: 0.82, eager: 0.5, llm: "gpt-4.1", voice: "aura-2-thalia-en", speed: 1.1 });
    expect(fromQuery(toQuery(c))).toEqual(c);
  });
  it("clamps and validates hand-edited links", () => {
    const c = fromQuery("s=nope&eot=3&eager=0.95&timeout=-5&llm=gpt-9&speed=abc");
    expect(c.session).toBe("pizza");
    expect(c.eot).toBe(1);
    expect(c.eager).toBe(0.9);
    expect(c.timeoutMs).toBe(500);
    expect(c.llm).toBe("gpt-4o-mini");
    expect(c.speed).toBe(1);
  });
});

describe("generated code", () => {
  it("Settings reflects Flux turn-detection params exactly", () => {
    const s = settingsMessage(cfg({ eot: 0.83, eager: 0.5, timeoutMs: 3000 }));
    expect(s.agent.listen.provider).toMatchObject({ model: "flux-general-en", version: "v2", eot_threshold: 0.83, eager_eot_threshold: 0.5, eot_timeout_ms: 3000 });
  });
  it("Nova-3 drops Flux-only params; tools keep defer_until_eot", () => {
    const s = settingsMessage(cfg({ listen: "nova-3" }));
    expect(s.agent.listen.provider).not.toHaveProperty("eot_threshold");
    expect(JSON.stringify(s)).toContain('"defer_until_eot":true');
  });
  it("never inlines a key", () => {
    for (const lang of ["json", "javascript", "python"] as const) {
      const c = code(cfg(), lang);
      expect(c).not.toMatch(/dg_|Token [a-f0-9]{20}/);
      if (lang !== "json") expect(c).toContain("DEEPGRAM_API_KEY");
    }
  });
});

describe("cost", () => {
  it("prices Voice Agent minutes at $0.075", () => {
    expect(sessionCost(60)).toBeCloseTo(0.075, 4);
    expect(callsOnFreeCredit(60)).toBe(2666);
  });
});

describe("API key rules", () => {
  it("custom-scoped keys can't mint temporary tokens (the FORBIDDEN trap)", () => {
    expect(capabilities("custom").tempTokens).toBe(false);
    expect(missing("browser", "custom")).toContain("tempTokens");
    expect(missing("browser", "member")).toEqual([]);
  });
  it("only Owners can change billing; admin keys warn about excess power", () => {
    expect(capabilities("admin").billing).toBe(false);
    expect(capabilities("owner").billing).toBe(true);
    expect(excess("server", "owner")).toEqual(["keys", "billing"]);
    expect(excess("server", "member")).toEqual([]);
  });
  it("masks secrets", () => {
    expect(maskKey("dg_demo_1234567890abcd")).toMatch(/^dg_d•+abcd$/);
  });
});

describe("usage", () => {
  it("projects spend and reports latency percentiles per model", () => {
    const s = spend();
    expect(s.projected).toBeGreaterThan(s.used);
    const lat = latencyByModel();
    expect(lat.length).toBe(5);
    for (const l of lat) expect(l.p95).toBeGreaterThanOrEqual(l.p50);
    expect(REQUESTS.length).toBeGreaterThan(300);
  });
});

describe("Cosmos contrast", () => {
  it("primary button and body text pass; Cosmos control border needs the proposed token", () => {
    expect(contrast("#232329", "#fbfbff")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#bbbbbf", "#18181d")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#4e4e52", "#18181d")).toBeLessThan(3);
    expect(contrast("#66666c", "#18181d")).toBeGreaterThanOrEqual(3);
    expect(contrast("#ef0074", "#18181d")).toBeLessThan(4.5);
    expect(contrast("#ff7ab8", "#18181d")).toBeGreaterThanOrEqual(4.5);
  });
});
