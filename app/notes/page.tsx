import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Notes and handoff",
  description: "Why each decision was made, a handoff spec for engineering, how AI was used, and what's real versus illustrative in the Turn by Turn concept.",
};

const DECISIONS: { title: string; why: string; lost: string }[] = [
  {
    title: "Lead with time to first audio, at p50 and p95",
    why: "It's the latency a caller feels. Percentiles show the slow tail that averages hide; production voice agents often look fine on average and feel slow one call in twenty.",
    lost: "A single “average latency” number. Easy to read, and misleading.",
  },
  {
    title: "Draw stages on one shared axis, overlapping",
    why: "With eager end-of-turn, the LLM starts before the turn is confirmed. A stacked bar would add up work that ran in parallel and overstate latency.",
    lost: "Stacked bars per component. Familiar, but wrong for speculative pipelines.",
  },
  {
    title: "Make turn detection the hero control",
    why: "It's where Flux differs from every timer-based model, and the setting developers understand least. Showing confidence under the real words turns an abstract number into a visible trade-off.",
    lost: "A settings form with eot_threshold as one field among many.",
  },
  {
    title: "Recorded sessions first, live second",
    why: "A reviewer gets the full story in ten seconds with no permissions, keys or cost. Live mic is one click away for the curious.",
    lost: "Live-only. Impressive when it works; blank when the mic is blocked.",
  },
  {
    title: "Every config is a URL",
    why: "“Look at turn 3 with eager on” should be a link you paste in Slack or a support ticket. It's in deepgram/examples issue #304 for the same reason.",
    lost: "Saved presets behind an account.",
  },
  {
    title: "Keys start from the job, not the role",
    why: "The FORBIDDEN trap on temporary tokens comes from picking a role without knowing what it allows. Asking “what will this key do?” lets Console choose least privilege and say so before the key exists.",
    lost: "A role dropdown with a help link.",
  },
];

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <p className="eyebrow">Design · Notes and handoff</p>
      <h1 className="display mt-1 text-3xl sm:text-4xl">The why, alongside the what</h1>
      <p className="mt-2 max-w-3xl text-muted">The posting asks for decisions that are legible to the team and to engineering. This page is how I&apos;d hand this work over.</p>

      <Section title="What this answers">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card title="deepgram/examples #304">Raised by Deepgram&apos;s own DX system: a playground with word timings, waveforms, latency display, a request inspector and shareable config URLs, to move developers “from curious to convinced”. This concept builds that for the Voice Agent.</Card>
          <Card title="“Latency stats in one place”">G2 reviewers ask for per-request latency and better visual analytics. Turn by Turn shows it per turn; Usage shows p50/p95 per model.</Card>
          <Card title="Flux vs Nova-3 confusion">Developers ask which is “better”. The playground and model card explain the real difference: where turn detection lives.</Card>
          <Card title="The temporary-token trap">A changelog correction (Sep 18, 2026) clarified that minting temporary tokens needs Member role or higher. Key creation now makes that impossible to get wrong.</Card>
        </ul>
      </Section>

      <Section title="Decision log">
        <ol className="space-y-3">
          {DECISIONS.map((d, i) => (
            <li key={d.title} className="grid grid-cols-1 gap-4 rounded-lg border border-line bg-card p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
              <div>
                <p className="font-mono text-xs text-green">D{i + 1}</p>
                <p className="mt-1 font-semibold text-text">{d.title}</p>
                <p className="mt-1 leading-relaxed text-muted">{d.why}</p>
              </div>
              <div className="rounded-lg bg-bg p-4">
                <p className="text-xs text-dim">Explored and set aside</p>
                <p className="mt-1 text-sm text-muted">{d.lost}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Handoff: end-of-turn threshold control">
        <div className="overflow-x-auto rounded-lg border border-line bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">States and behaviour of the threshold control</caption>
            <thead className="text-xs text-muted">
              <tr>
                {["State", "Visual", "Behaviour"].map((h) => (
                  <th key={h} scope="col" className="border-b border-line px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Default", "2px #13ef93 line, value pill at right", "Mirrors the eot_threshold slider; both write the same value"],
                ["Hover", "Cursor ns-resize, 16px invisible hit area", "No value change until drag"],
                ["Dragging", "Pill shows live value, 0.01 steps", "Clamped 0.5–1.0 (API range); replays the session on change"],
                ["Eager on", "Dashed #79affa line below", "eager_eot_threshold can never exceed eot_threshold; it's clamped"],
                ["Nova-3", "Curve replaced by silence gaps; long gaps red", "Threshold hidden; endpointing slider shown instead"],
                ["Keyboard", "Slider focus ring #13ef93", "Arrow keys ±0.01; value text announced (“0.70”)"],
              ].map((r) => (
                <tr key={r[0]} className="border-t border-line align-top">
                  <th scope="row" className="px-4 py-3 font-semibold text-text">
                    {r[0]}
                  </th>
                  <td className="px-4 py-3 text-muted">{r[1]}</td>
                  <td className="px-4 py-3 text-muted">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Spacing follows Cosmos: cards 24px padding, 8px corners; controls 36–44px; 16px between controls in a panel; 4px button corners. Components and live specimens are on{" "}
          <Link href="/cosmos" className="link">
            Cosmos+
          </Link>
          .
        </p>
      </Section>

      <Section title="How I used AI">
        <ul className="space-y-2 text-muted">
          <li>
            <b className="text-text">Research:</b> agents read the job post, Deepgram&apos;s docs, changelog, GitHub issues and public reviews in parallel, so I started from evidence rather than guesses.
          </li>
          <li>
            <b className="text-text">Measurement:</b> the Cosmos foundations were read from the live Playground&apos;s computed styles, not eyeballed from screenshots.
          </li>
          <li>
            <b className="text-text">Building:</b> I designed in code with Claude Code as a pair. I made the calls on what to show, what to cut and what the words say; it handled the TypeScript and tests.
          </li>
          <li>
            <b className="text-text">Where it didn&apos;t help:</b> deciding that turn detection was the story, and that the waterfall must overlap rather than stack. Those came from reading the LatencyReport docs and thinking about what a developer is actually trying to debug.
          </li>
        </ul>
      </Section>

      <Section title="What's real, what's illustrative">
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>Real: Voice Agent Settings shape and parameter ranges, LatencyReport fields, event names, Flux parameters, pricing, key roles and limits, Cosmos colours, type and spacing.</li>
          <li>Illustrative: the recorded sessions, end-of-turn confidence curves, component timings (STT finalise, LLM and TTS first byte) and the usage log.</li>
          <li>Proposed, not shipped: budget alerts, project-level data settings, the control-border token.</li>
          <li>Live mic: the silence timer is real and runs locally. Flux streaming uses your own key; message fields are read defensively and shown raw.</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="display mb-4 text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="rounded-lg border border-line bg-card p-5">
      <p className="font-semibold text-text">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </li>
  );
}
