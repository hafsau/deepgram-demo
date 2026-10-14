"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { btn, selectable } from "@/components/styles";
import { Segmented } from "@/components/ui";
import { CodeBlock } from "@/components/voice/code-block";
import { Panel, Select, Slider } from "@/components/voice/controls";
import { EotChart } from "@/components/voice/eot-chart";
import { Timeline } from "@/components/voice/timeline";
import { AgentReply, Transcript } from "@/components/voice/transcript";
import { Waterfall } from "@/components/voice/waterfall";
import { code } from "@/lib/code";
import { callsOnFreeCredit, per1000Calls, sessionCost, usd } from "@/lib/cost";
import { DEFAULT_CONFIG, events, LIMITS, LISTEN_LABEL, LLM_LABEL, simulate, VOICE_LABEL, type Config, type ListenModel, type LlmModel, type Voice } from "@/lib/engine";
import { SESSIONS, SESSION_BY_ID } from "@/lib/sessions";
import { toQuery } from "@/lib/share";

const ms = (s: number) => `${Math.round(s * 1000)} ms`;
const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${(s % 60).toFixed(2).padStart(5, "0")}`;

export function Playground({ initial }: { initial: Config }) {
  const router = useRouter();
  const pathname = usePathname();
  const [cfg, setCfgState] = useState<Config>(initial);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<"events" | "code" | "cost">("events");
  const [shared, setShared] = useState("");
  const id = useId();

  const session = SESSION_BY_ID[cfg.session];
  const sim = useMemo(() => simulate(session, cfg), [session, cfg]);
  const evs = useMemo(() => events(session, sim, cfg), [session, sim, cfg]);
  const turn = sim.turns[Math.min(selected, sim.turns.length - 1)];

  const setCfg = (patch: Partial<Config>) => {
    setCfgState((c) => {
      const next = { ...c, ...patch };
      if (next.eager !== null && next.eager > next.eot) next.eager = next.eot;
      return next;
    });
  };

  useEffect(() => {
    const q = toQuery(cfg);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [cfg, pathname, router]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared("Link copied.");
    } catch {
      setShared(`Copy this link: ${window.location.href}`);
    }
  };

  const cost = sessionCost(sim.duration);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Playground · Voice Agent</p>
          <h1 className="display mt-1 text-3xl text-text sm:text-4xl">
            Turn by turn: <span className="gradient-text">see where the time goes</span>
          </h1>
          <p className="mt-2 max-w-3xl text-muted">Replay a call. Tune turn detection. Watch every turn change.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={share} className={btn("primary")}>
            Copy share link
          </button>
          <button type="button" onClick={() => setCfgState({ ...DEFAULT_CONFIG, session: cfg.session })} className={btn("secondary")}>
            Reset settings
          </button>
        </div>
      </div>
      <p role="status" className="mt-2 min-h-5 text-sm text-green">
        {shared}
      </p>

      <div className="mt-2">
        <Segmented
          label="Recorded session"
          value={cfg.session}
          options={SESSIONS.map((x) => ({ value: x.id, label: x.title }))}
          onChange={(v) => (setCfg({ session: v }), setSelected(0))}
        />
      </div>
      
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[290px_minmax(0,1fr)] 2xl:grid-cols-[290px_minmax(0,1fr)_380px]">
        {/* ---------------- Config ---------------- */}
        <aside aria-label="Settings" className="space-y-4">
          <Panel title="Listen" id={`${id}-listen`}>
            <fieldset>
              <legend className="sr-only">Speech-to-text model</legend>
              <div className="space-y-2">
                {(["flux", "nova-3"] as ListenModel[]).map((m) => (
                  <label key={m} className={selectable(cfg.listen === m)}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name={`${id}-model`} checked={cfg.listen === m} onChange={() => setCfg({ listen: m })} className="size-4 accent-[var(--green)]" />
                      <span className="text-sm font-semibold text-text">{LISTEN_LABEL[m]}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted">
                      {m === "flux" ? "Detects turn endings in the model." : "Ends turns after silence."}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 space-y-4">
              {cfg.listen === "flux" ? (
                <>
                  <Slider label="eot_threshold" value={cfg.eot} min={LIMITS.eot[0]} max={LIMITS.eot[1]} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => setCfg({ eot: v })} hint="Lower is faster, but cuts more callers off." />
                  <div>
                    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-text">
                      <input type="checkbox" checked={cfg.eager !== null} onChange={(e) => setCfg({ eager: e.target.checked ? Math.min(0.5, cfg.eot) : null })} className="size-4 accent-[var(--green)]" />
                      Eager end-of-turn
                    </label>
                    {cfg.eager !== null && <Slider label="eager_eot_threshold" value={cfg.eager} min={LIMITS.eager[0]} max={Math.min(LIMITS.eager[1], cfg.eot)} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => setCfg({ eager: v })} hint="Starts the reply early. Costs extra LLM calls." />}
                  </div>
                  <Slider label="eot_timeout_ms" value={cfg.timeoutMs} min={LIMITS.timeoutMs[0]} max={LIMITS.timeoutMs[1]} step={100} format={(v) => `${v} ms`} onChange={(v) => setCfg({ timeoutMs: v })} hint="Maximum silence before a turn ends." />
                </>
              ) : (
                <Slider label="Endpointing (silence)" value={cfg.endpointingMs} min={LIMITS.endpointingMs[0]} max={LIMITS.endpointingMs[1]} step={50} format={(v) => `${v} ms`} onChange={(v) => setCfg({ endpointingMs: v })} hint="Shorter is faster, until someone pauses." />
              )}
            </div>
          </Panel>
          <Panel title="Think and speak" id={`${id}-think`}>
            <div className="space-y-4">
              <Select<LlmModel> label="LLM" value={cfg.llm} options={(Object.keys(LLM_LABEL) as LlmModel[]).map((v) => ({ value: v, label: LLM_LABEL[v] }))} onChange={(v) => setCfg({ llm: v })} />
              <Select<Voice> label="Voice" value={cfg.voice} options={(Object.keys(VOICE_LABEL) as Voice[]).map((v) => ({ value: v, label: VOICE_LABEL[v] }))} onChange={(v) => setCfg({ voice: v })} />
              <Slider label="Speed" value={cfg.speed} min={LIMITS.speed[0]} max={LIMITS.speed[1]} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => setCfg({ speed: v })} />
            </div>
          </Panel>
          <p className="px-1 text-xs leading-snug text-dim">Synthetic sessions, illustrative timings.</p>
        </aside>

        {/* ---------------- Main ---------------- */}
        <div className="min-w-0 space-y-4">
          <section aria-labelledby={`${id}-sum`} className="rounded-lg border border-line bg-card p-5 sm:p-6">
            <h2 id={`${id}-sum`} className="sr-only">
              Session summary
            </h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
              <Metric label="p50 to first audio" value={ms(sim.summary.p50)} accent />
              <Metric label="p95 to first audio" value={ms(sim.summary.p95)} />
              <Metric label="Callers cut off" value={String(sim.summary.cutEarly)} warn={sim.summary.cutEarly > 0} />
              <Metric label="Wasted LLM calls" value={cfg.eager !== null ? String(sim.summary.wastedLlm) : "–"} />
              <Metric label="Interruptions" value={String(sim.summary.interruptions)} />
              <Metric label="This call" value={usd(cost, 3)} />
            </dl>
            <p className="sr-only" role="status" aria-live="polite">
              p50 {ms(sim.summary.p50)}, p95 {ms(sim.summary.p95)}, {sim.summary.cutEarly} {sim.summary.cutEarly === 1 ? "caller" : "callers"} cut off.
            </p>
          </section>

          <Panel title="Session timeline" id={`${id}-tl`}>
            <Timeline sim={sim} selected={turn.index} onSelect={setSelected} />
          </Panel>

          <Panel
            title={`Turn ${turn.index + 1}: ${cfg.listen === "flux" ? "end-of-turn confidence" : "silence endpointing"}`}
            id={`${id}-eot`}
            actions={<span className="font-mono text-xs text-muted">{cfg.listen === "flux" ? "drag the line to adjust" : `endpointing ${cfg.endpointingMs} ms`}</span>}
          >
            <EotChart words={turn.exchange.words} detection={turn.detection} threshold={cfg.eot} eager={cfg.eager} mode={cfg.listen} endpointingMs={cfg.endpointingMs} onThreshold={(v) => setCfg({ eot: v })} />
            <p className="mt-2 text-sm text-muted">
              {turn.detection.premature ? (
                <>
                  <span className="font-semibold text-red">Cut early.</span> Ended after “{turn.exchange.words[turn.detection.premature.afterWord].w}”, mid-sentence. {cfg.listen === "flux" ? "Raise eot_threshold." : "Lengthen endpointing, or try Flux."}
                </>
              ) : (
                <>
                  <span className="font-semibold text-green">Clean turn.</span> Ended {ms(turn.detection.finalEot - turn.detection.lastEnd)} after the last word{turn.detection.timedOut ? " (timeout)" : ""}.
                </>
              )}
            </p>
          </Panel>

          <Panel title={`Turn ${turn.index + 1}: what happened`} id={`${id}-turn`}>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted">Caller</p>
                  <Transcript words={turn.exchange.words} cutAfter={turn.detection.premature?.afterWord ?? null} />
                </div>
                <div>
                  <p className="text-xs text-muted">Agent</p>
                  <AgentReply text={turn.agentText} heard={turn.heard} />
                </div>
                {turn.exchange.agent.tool && (
                  <p className="inline-flex flex-wrap items-center gap-2 rounded-full border border-amber bg-amber/15 px-2.5 py-0.5 font-mono text-xs text-text">
                    ƒ {turn.exchange.agent.tool.name}
                    {turn.exchange.agent.tool.defer && <span className="text-text">defer_until_eot</span>}
                  </p>
                )}
              </div>
              <div>
                <Waterfall stages={turn.stages} total={turn.report.total_latency} label={`Turn ${turn.index + 1} latency`} />
                <details className="mt-3">
                  <summary className="min-h-9 cursor-pointer text-sm text-link">LatencyReport for this turn</summary>
                  <pre className="mt-2 overflow-auto rounded-lg bg-bg p-3 font-mono text-xs text-body">{JSON.stringify(turn.report, null, 2)}</pre>
                </details>
              </div>
            </div>
          </Panel>
        </div>

        {/* ---------------- Inspector ---------------- */}
        <aside aria-label="Inspector" className="min-w-0 lg:col-span-2 2xl:col-span-1">
          <div className="rounded-lg border border-line bg-card 2xl:sticky 2xl:top-20">
            <div role="tablist" aria-label="Inspector" className="flex gap-1 border-b border-line p-2">
              {(["events", "code", "cost"] as const).map((t, i, all) => (
                <button
                  key={t}
                  id={`${id}-tab-${t}`}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  aria-controls={`${id}-panel-${t}`}
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => setTab(t)}
                  onKeyDown={(e) => {
                    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                    if (!d) return;
                    e.preventDefault();
                    const n = all[(i + d + all.length) % all.length];
                    setTab(n);
                    document.getElementById(`${id}-tab-${n}`)?.focus();
                  }}
                  className={`h-8 rounded-lg px-3 font-[family-name:var(--font-roobert)] text-sm font-semibold capitalize ${tab === t ? "bg-btn text-raised" : "text-muted hover:text-text"}`}
                >
                  {t === "code" ? "Get code" : t}
                </button>
              ))}
            </div>
            <div id={`${id}-panel-${tab}`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="p-3">
              {tab === "events" && (
                <ol className="max-h-[640px] space-y-1 overflow-auto font-mono text-xs" aria-label="Agent events">
                  {evs.map((e, i) => (
                    <li key={i}>
                      <details className="rounded-md hover:bg-surface">
                        <summary className="flex min-h-9 cursor-pointer items-center gap-2 px-2">
                          <span className="text-dim tnum">{clock(e.t)}</span>
                          <span className={e.type === "LatencyReport" ? "text-green" : e.type === "FunctionCallRequest" ? "text-amber" : "text-text"}>{e.type}</span>
                          {e.detail && <span className="truncate text-muted">{e.detail}</span>}
                        </summary>
                        <pre className="mx-2 mb-2 overflow-auto rounded bg-bg p-2 text-xs text-muted">{JSON.stringify(e.payload, null, 2)}</pre>
                      </details>
                    </li>
                  ))}
                </ol>
              )}
              {tab === "code" && (
                <CodeBlock
                  tabs={[
                    { id: "json", label: "Settings", code: code(cfg, "json") },
                    { id: "js", label: "Node.js", code: code(cfg, "javascript") },
                    { id: "py", label: "Python", code: code(cfg, "python") },
                  ]}
                  note="Matches the settings on this page. Reads DEEPGRAM_API_KEY."
                />
              )}
              {tab === "cost" && (
                <dl className="space-y-3 text-sm">
                  <Row k="Session length" v={`${sim.duration.toFixed(1)} s`} />
                  <Row k="This call (Voice Agent, standard)" v={usd(cost, 3)} />
                  <Row k="1,000 calls like this" v={usd(per1000Calls(sim.duration))} />
                  <Row k="Calls covered by the $200 free credit" v={callsOnFreeCredit(sim.duration).toLocaleString()} />
                </dl>
              )}
              {tab === "cost" && (
                <p className="mt-3 text-xs text-muted">Voice Agent standard, $0.075/min (Oct 2026).</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 font-[family-name:var(--font-roobert)] text-2xl font-medium tnum ${accent ? "text-green" : warn ? "text-red" : "text-text"}`}>{value}</dd>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
      <dt className="text-muted">{k}</dt>
      <dd className="font-mono text-text tnum">{v}</dd>
    </div>
  );
}
