"use client";

import { useRef } from "react";
import { eotConfidence, type TurnDetection } from "@/lib/engine";
import type { Word } from "@/lib/sessions";

/*
 * End-of-turn confidence for one user turn, against the threshold. Words sit
 * underneath so you can see *where* confidence spikes: mid-sentence pauses
 * are where a low threshold cuts callers off. The threshold line can be
 * dragged; the slider in the config panel is the accessible control for the
 * same value, so the chart itself is a pointer convenience.
 */

const W = 760;
const H = 200;
const PAD = { l: 36, r: 12, t: 12, b: 46 };

export function EotChart({
  words,
  detection,
  threshold,
  eager,
  mode,
  endpointingMs,
  onThreshold,
}: {
  words: Word[];
  detection: TurnDetection;
  threshold: number;
  eager: number | null;
  mode: "flux" | "nova-3";
  endpointingMs: number;
  onThreshold?: (v: number) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const end = Math.max(detection.finalEot + 0.6, words[words.length - 1].e + 1.2);
  const x = (t: number) => PAD.l + (t / end) * (W - PAD.l - PAD.r);
  const y = (p: number) => PAD.t + (1 - p) * (H - PAD.t - PAD.b);

  const pts: string[] = [];
  for (let t = 0; t <= end; t += 0.02) pts.push(`${x(t).toFixed(1)},${y(eotConfidence(words, t)).toFixed(1)}`);

  const fromPointer = (clientY: number) => {
    const r = svg.current!.getBoundingClientRect();
    const py = ((clientY - r.top) / r.height) * H;
    const p = 1 - (py - PAD.t) / (H - PAD.t - PAD.b);
    return Math.round(Math.min(1, Math.max(0.5, p)) * 100) / 100;
  };

  const premature = detection.premature;
  const summary =
    mode === "flux"
      ? `End-of-turn confidence for this turn. Threshold ${threshold}. ${premature ? `Crossed mid-sentence at ${premature.at.toFixed(2)} seconds, after “${words[premature.afterWord].w}”.` : "Never crossed mid-sentence."} Turn confirmed at ${detection.finalEot.toFixed(2)} seconds${detection.timedOut ? " by timeout" : ""}, ${Math.round((detection.finalEot - detection.lastEnd) * 1000)} ms after the last word.`
      : `Silence-based endpointing at ${endpointingMs} ms. ${premature ? `A pause after “${words[premature.afterWord].w}” was long enough to end the turn early.` : "No pause was long enough to end the turn early."}`;

  return (
    <figure>
      <figcaption className="sr-only">{summary}</figcaption>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none select-none"
        aria-hidden="true"
        onPointerMove={(e) => dragging.current && onThreshold?.(fromPointer(e.clientY))}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
      >
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <g key={p}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(p)} y2={y(p)} stroke="var(--line)" />
            <text x={PAD.l - 6} y={y(p) + 3} textAnchor="end" fontSize="12" fill="var(--dim)" fontFamily="var(--font-fira)">
              {p.toFixed(2)}
            </text>
          </g>
        ))}

        {/* words */}
        {words.map((w, i) => (
          <g key={i}>
            <rect x={x(w.s)} y={H - PAD.b + 8} width={Math.max(2, x(w.e) - x(w.s))} height={10} rx={2} fill={premature && i > premature.afterWord ? "var(--red)" : "var(--muted)"} opacity={w.conf < 0.8 ? 0.45 : 0.85} />
            <text x={(x(w.s) + x(w.e)) / 2} y={H - 8} textAnchor="middle" fontSize="12" fill={premature && i > premature.afterWord ? "var(--red)" : "var(--muted)"}>
              {w.w}
            </text>
          </g>
        ))}

        {mode === "flux" ? (
          <>
            <polyline points={pts.join(" ")} fill="none" stroke="var(--purple)" strokeWidth={2} />
            {eager !== null && <line x1={PAD.l} x2={W - PAD.r} y1={y(eager)} y2={y(eager)} stroke="var(--link)" strokeDasharray="4 4" />}
            {eager !== null && (
              <text x={W - PAD.r - 4} y={y(eager) - 4} textAnchor="end" fontSize="12" fill="var(--link)">
                eager {eager.toFixed(2)}
              </text>
            )}
            <g
              className="cursor-ns-resize"
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as Element).setPointerCapture?.(e.pointerId);
              }}
            >
              <line x1={PAD.l} x2={W - PAD.r} y1={y(threshold)} y2={y(threshold)} stroke="transparent" strokeWidth={16} />
              <line x1={PAD.l} x2={W - PAD.r} y1={y(threshold)} y2={y(threshold)} stroke="var(--green)" strokeWidth={2} />
              <rect x={W - PAD.r - 92} y={y(threshold) - 18} width={88} height={16} rx={8} fill="var(--green)" />
              <text x={W - PAD.r - 48} y={y(threshold) - 6} textAnchor="middle" fontSize="12" fontWeight={600} fill="var(--bg)">
                eot {threshold.toFixed(2)} ⇕
              </text>
            </g>
          </>
        ) : (
          words.slice(0, -1).map((w, i) => {
            const gap = words[i + 1].s - w.e;
            const long = gap >= endpointingMs / 1000;
            return <rect key={i} x={x(w.e)} y={y(0.95)} width={Math.max(1, x(words[i + 1].s) - x(w.e))} height={y(0.05) - y(0.95)} fill={long ? "var(--red)" : "var(--line)"} opacity={long ? 0.35 : 0.5} />;
          })
        )}

        {premature && (
          <g>
            <line x1={x(premature.at)} x2={x(premature.at)} y1={PAD.t} y2={H - PAD.b + 4} stroke="var(--red)" strokeWidth={2} />
            <text x={x(premature.at) + 4} y={PAD.t + 10} fontSize="12" fill="var(--red)">
              cut early
            </text>
          </g>
        )}
        <line x1={x(detection.finalEot)} x2={x(detection.finalEot)} y1={PAD.t} y2={H - PAD.b + 4} stroke="var(--green)" strokeDasharray="3 3" />
        <text x={x(detection.finalEot) + 4} y={PAD.t + 24} fontSize="12" fill="var(--green)">
          {detection.timedOut ? "timeout" : "end of turn"}
        </text>
      </svg>
    </figure>
  );
}
