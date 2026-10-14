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
    why: "It's what callers feel. Averages hide the slow tail.",
    lost: "One average latency number.",
  },
  {
    title: "Draw stages on one shared axis, overlapping",
    why: "Eager replies run in parallel. Stacking would overstate latency.",
    lost: "Stacked bars.",
  },
  {
    title: "Make turn detection the hero control",
    why: "It's Flux's edge, and the least understood setting.",
    lost: "A plain settings form.",
  },
  {
    title: "Recorded sessions first, live second",
    why: "The story in ten seconds, no mic or key needed.",
    lost: "Live-only.",
  },
  {
    title: "Every config is a URL",
    why: "“Look at turn 3 with eager on” should be a link.",
    lost: "Saved presets behind a login.",
  },
  {
    title: "Keys start from the job, not the role",
    why: "Prevents the FORBIDDEN trap and over-privileged keys.",
    lost: "A role dropdown.",
  },
];

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <p className="eyebrow">Design · Notes and handoff</p>
      <h1 className="display mt-1 text-3xl sm:text-4xl">The why, alongside the what</h1>
      <p className="mt-2 max-w-3xl text-muted">Decisions, handoff and limits.</p>

      <Section title="What this answers">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card title="deepgram/examples #304">Latency display, request inspector, shareable configs.</Card>
          <Card title="“Latency stats in one place” (G2)">Per turn in Playground, p50/p95 in Usage.</Card>
          <Card title="Flux vs Nova-3 confusion">Explained by where turn detection lives.</Card>
          <Card title="The temporary-token trap">Blocked before the key exists.</Card>
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
          Spacing per Cosmos. Specimens on{" "}
          <Link href="/cosmos" className="link">
            Cosmos+
          </Link>
          .
        </p>
      </Section>

      <Section title="How I used AI">
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>Research agents read the docs, changelog, issues and reviews in parallel.</li>
          <li>Cosmos styles were measured from the live Playground, not eyeballed.</li>
          <li>Built in code with Claude Code. The design calls were mine.</li>
        </ul>
      </Section>

      <Section title="What's real, what's illustrative">
        <ul className="list-disc space-y-1.5 pl-5 text-muted">
          <li>Real: API shapes, parameters, events, pricing, key rules, Cosmos styles.</li>
          <li>Illustrative: sessions, confidence curves, timings, usage log.</li>
          <li>Proposed: budget alerts, project data settings, control-border token.</li>
          <li>Live mic: real, local silence timer; Flux with your own key.</li>
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
