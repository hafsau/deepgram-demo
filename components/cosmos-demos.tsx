"use client";

import { useState, type ReactNode } from "react";
import { selectable } from "@/components/styles";
import { CodeBlock } from "@/components/voice/code-block";
import { Slider } from "@/components/voice/controls";
import { EotChart } from "@/components/voice/eot-chart";
import { AgentReply, Transcript } from "@/components/voice/transcript";
import { Waterfall } from "@/components/voice/waterfall";
import { code } from "@/lib/code";
import { DEFAULT_CONFIG, simulate } from "@/lib/engine";
import { SESSION_BY_ID } from "@/lib/sessions";

/* Live component specimens for /cosmos, each with its contract. */

export function CosmosDemos() {
  const [eot, setEot] = useState(0.7);
  const [eager, setEager] = useState(false);
  const [model, setModel] = useState<"flux" | "nova-3">("flux");
  const cfg = { ...DEFAULT_CONFIG, eot, eager: eager ? 0.5 : null };
  const sim = simulate(SESSION_BY_ID.pizza, cfg);
  const t = sim.turns[0];
  const clinic = simulate(SESSION_BY_ID.clinic, cfg).turns[1];
  const support = simulate(SESSION_BY_ID.support, cfg).turns[0];

  return (
    <div className="space-y-4">
      <Spec
        name="Latency waterfall"
        why="Voice latency is overlapping work, not a sum: an eager LLM call starts before the turn is confirmed. One shared axis from “caller stopped speaking” shows the overlap honestly, and the headline is time to first audio, the number a caller feels."
        states={["Default", "With eager reply (overlap)", "With tool call", "Held for confirmation (hatched)", "Compact (in lists)"]}
        a11y={["Text summary of every stage in the figure caption", "Stage names are in the row, so colour is never the only key", "Hatch pattern for the one non-work stage"]}
      >
        <label className="mb-3 flex min-h-9 cursor-pointer items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={eager} onChange={(e) => setEager(e.target.checked)} className="size-4 accent-[var(--green)]" />
          Eager reply (shows overlap and the held stage)
        </label>
        <Waterfall stages={clinic.stages} total={clinic.report.total_latency} label="Clinic, turn 2, with a tool call" />
      </Spec>

      <Spec
        name="End-of-turn chart"
        why="Turn detection is the most misunderstood setting in voice agents. Plotting confidence under the actual words makes the trade-off visible: the spike after “large” is where a low threshold cuts the caller off."
        states={["Flux: confidence curve and threshold", "Eager line", "Cut early marker", "Timeout", "Nova-3: silence gaps instead of a curve"]}
        a11y={["The draggable line is a convenience; the labelled slider is the accessible control", "Caption states where and why the turn ended"]}
      >
        <Slider label="eot_threshold" value={eot} min={0.5} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={setEot} />
        <EotChart words={t.exchange.words} detection={t.detection} threshold={eot} eager={cfg.eager} mode="flux" endpointingMs={700} onThreshold={setEot} />
      </Spec>

      <Spec
        name="Transcript with confidence and cuts"
        why="Developers debugging an agent need to see what the agent heard, not what the caller said. The cut marker and the struck-through, unheard reply answer “why did it respond to half a sentence?” and “why does the user think it never told them?”."
        states={["Default", "Low-confidence word (dotted underline)", "Cut early marker", "Agent reply interrupted (heard up to here)"]}
        a11y={["Low confidence is announced in text, not only underlined", "The unheard part of the reply is explained for screen readers"]}
      >
        <Transcript words={t.exchange.words} cutAfter={t.detection.premature?.afterWord ?? null} />
        <div className="mt-3">
          <AgentReply text={support.agentText} heard={0.42} />
        </div>
      </Spec>

      <Spec
        name="Model picker card"
        why="Developers ask “Flux or Nova-3?” as an accuracy question. The real difference is where turn detection lives, so the card leads with that, in one line."
        states={["Default", "Hover", "Selected (green border)", "Focus"]}
        a11y={["Native radios inside a fieldset with a legend", "Selection shown by border and the radio dot"]}
      >
        <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <legend className="sr-only">Speech-to-text model</legend>
          {(["flux", "nova-3"] as const).map((m) => (
            <label key={m} className={selectable(model === m)}>
              <span className="flex items-center gap-2">
                <input type="radio" name="cosmos-model" checked={model === m} onChange={() => setModel(m)} className="size-4 accent-[var(--green)]" />
                <span className="text-sm font-semibold text-text">{m === "flux" ? "Flux" : "Nova-3"}</span>
              </span>
              <span className="mt-1 block text-xs text-muted">{m === "flux" ? "Turn detection in the model." : "Turn ends after a silence timer."}</span>
            </label>
          ))}
        </fieldset>
      </Spec>

      <Spec
        name="Code block"
        why="“Get code” must produce exactly what the UI is set to, or developers lose trust in the Playground the first time they paste it. Keys are never inlined."
        states={["Settings JSON", "Node.js", "Python", "Copied"]}
        a11y={["Tabs follow the ARIA tabs pattern with arrow keys", "Code region is focusable for keyboard scrolling", "Copy result announced in a status region"]}
      >
        <CodeBlock
          tabs={[
            { id: "json", label: "Settings", code: code(cfg, "json") },
            { id: "js", label: "Node.js", code: code(cfg, "javascript") },
          ]}
          note="Generated from the specimen settings above."
        />
      </Spec>
    </div>
  );
}

function Spec({ name, why, states, a11y, children }: { name: string; why: string; states: string[]; a11y: string[]; children: ReactNode }) {
  return (
    <article className="grid grid-cols-1 gap-6 rounded-lg border border-line bg-card p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <h3 className="panel-title">{name}</h3>
        <div className="mt-4">{children}</div>
      </div>
      <div className="space-y-4 text-sm">
        <div>
          <p className="font-semibold text-text">Why</p>
          <p className="mt-1 leading-relaxed text-muted">{why}</p>
        </div>
        <div>
          <p className="font-semibold text-text">States</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted">
            {states.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-text">Accessibility contract</p>
          <ul className="mt-1 space-y-1 text-muted">
            {a11y.map((s) => (
              <li key={s} className="flex gap-2">
                <span aria-hidden="true" className="text-green">
                  ✓
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
