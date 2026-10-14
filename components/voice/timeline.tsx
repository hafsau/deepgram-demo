import type { Simulation } from "@/lib/engine";

/*
 * Whole-session timeline: two lanes (caller, agent) on one clock. Agent audio
 * that was flushed by a barge-in is hatched. Each turn's response gap is
 * labelled. Selecting a turn here selects it everywhere.
 */

export function Timeline({ sim, selected, onSelect }: { sim: Simulation; selected: number; onSelect: (i: number) => void }) {
  const end = sim.duration + 0.5;
  const pct = (t: number) => `${(t / end) * 100}%`;
  const ticks = Array.from({ length: Math.floor(end / 5) + 1 }, (_, i) => i * 5);

  return (
    <div>
      <div className="grid grid-cols-[64px_1fr] gap-y-2 text-xs">
        <span className="self-center text-muted">Agent</span>
        <div className="relative h-7 rounded bg-bg">
          <span className="absolute inset-y-1 rounded-sm bg-pink/80" style={{ left: pct(sim.greeting.start), width: pct(sim.greeting.end - sim.greeting.start) }} />
          {sim.turns.map((t) => (
            <span key={t.index} className={`absolute inset-y-1 rounded-sm ${t.heard < 1 ? "" : "bg-pink/80"}`} style={{ left: pct(t.abs.firstAudio), width: pct(t.abs.audioEnd - t.abs.firstAudio), background: t.heard < 1 ? "color-mix(in srgb, var(--pink) 80%, transparent)" : undefined }}>
              {t.heard < 1 && <span className="hatch absolute inset-y-0 right-[-8px] w-2 text-amber" />}
            </span>
          ))}
        </div>
        <span className="self-center text-muted">Caller</span>
        <div className="relative h-7 rounded bg-bg">
          {sim.turns.map((t) =>
            t.exchange.words.map((w, i) => (
              <span key={`${t.index}-${i}`} className={`absolute inset-y-1.5 rounded-sm ${t.detection.premature && i > t.detection.premature.afterWord ? "bg-red/80" : "bg-text/70"}`} style={{ left: pct(t.abs.userStart + w.s), width: pct(w.e - w.s) }} />
            )),
          )}
        </div>
      </div>
      <div className="mt-1 grid grid-cols-[64px_1fr]">
        <span />
        <div className="relative h-4 font-mono text-xs text-dim" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
              {t}s
            </span>
          ))}
        </div>
      </div>
      <ol className="mt-3 flex flex-wrap gap-2" aria-label="Turns">
        {sim.turns.map((t) => (
          <li key={t.index}>
            <button
              type="button"
              onClick={() => onSelect(t.index)}
              aria-pressed={selected === t.index}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm ${selected === t.index ? "border-green text-text" : "border-line-strong text-muted hover:border-outline hover:text-text"}`}
            >
              <span className="font-mono text-xs">T{t.index + 1}</span>
              <span className="font-mono tnum">{Math.round(t.report.total_latency * 1000)} ms</span>
              {t.detection.premature && (
                <span className="text-red" title="Cut the caller off">
                  <span aria-hidden="true">✂</span>
                  <span className="sr-only">cut early</span>
                </span>
              )}
              {t.heard < 1 && (
                <span className="text-amber" title="Interrupted">
                  <span aria-hidden="true">⤺</span>
                  <span className="sr-only">interrupted</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
