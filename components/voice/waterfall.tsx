import type { Stage } from "@/lib/engine";

/*
 * Latency waterfall. Stages are drawn on one shared time axis from the moment
 * the user stops speaking, so overlaps are visible (an eager LLM call starts
 * before the turn is confirmed). Summing the stages would overstate latency.
 * The headline is time to first audio, the number a caller feels.
 * Each stage has a colour, a label and (for "hold") a hatch, never colour alone.
 */

export const STAGE_COLOR: Record<Stage["key"], string> = {
  turn: "var(--stage-turn)",
  stt: "var(--stage-stt)",
  llm: "var(--stage-llm)",
  tool: "var(--stage-tool)",
  tts: "var(--stage-tts)",
  hold: "var(--stage-hold)",
};

const ms = (s: number) => `${Math.round(s * 1000)} ms`;

export function Waterfall({ stages, total, max = 2.4, compact = false, label }: { stages: Stage[]; total: number; max?: number; compact?: boolean; label: string }) {
  const pct = (t: number) => `${Math.max(0, Math.min(100, (t / max) * 100))}%`;
  const ticks = [0, 0.5, 1, 1.5, 2].filter((t) => t <= max);
  const summary = `${label}: first audio ${ms(total)} after the caller stopped speaking. ${stages.map((s) => `${s.label} ${ms(s.from)} to ${ms(s.to)}`).join("; ")}.`;

  return (
    <figure className="w-full">
      <figcaption className="sr-only">{summary}</figcaption>
      <div aria-hidden="true" className="relative">
        <div className="space-y-1">
          {stages.map((s) => (
            <div key={s.key} className={`grid items-center gap-2 ${compact ? "grid-cols-[110px_1fr]" : "grid-cols-[150px_1fr]"}`}>
              <span className={`truncate text-muted ${compact ? "text-xs" : "text-xs"}`}>{s.label}</span>
              <span className={`relative block ${compact ? "h-2.5" : "h-3.5"} rounded-sm bg-bg`}>
                <span
                  className={`absolute inset-y-0 rounded-sm ${s.key === "hold" ? "hatch" : ""}`}
                  style={{
                    left: pct(Math.max(0, s.from)),
                    width: `max(3px, calc(${pct(s.to)} - ${pct(Math.max(0, s.from))}))`,
                    background: s.key === "hold" ? undefined : STAGE_COLOR[s.key],
                    color: STAGE_COLOR[s.key],
                  }}
                />
              </span>
            </div>
          ))}
        </div>
        {/* total marker */}
        <div className={`pointer-events-none absolute inset-y-0 ${compact ? "left-[118px]" : "left-[158px]"} right-0`}>
          <span className="absolute inset-y-[-4px] w-px bg-green" style={{ left: pct(total) }} />
        </div>
        {!compact && (
          <div className="mt-1 grid grid-cols-[150px_1fr] gap-2 font-mono text-xs text-dim">
            <span />
            <span className="relative h-3">
              {ticks.map((t) => (
                <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
                  {t}s
                </span>
              ))}
            </span>
          </div>
        )}
      </div>
      <p className={`mt-1 font-mono ${compact ? "text-xs" : "text-xs"} text-green`}>
        <span aria-hidden="true">▍</span>first audio {ms(total)}
      </p>
    </figure>
  );
}
