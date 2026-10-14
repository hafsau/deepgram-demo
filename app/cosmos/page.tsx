import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CosmosDemos } from "@/components/cosmos-demos";
import { btn } from "@/components/styles";
import { Badge } from "@/components/ui";
import { contrast } from "@/lib/contrast";

export const metadata: Metadata = {
  title: "Cosmos+ components",
  description: "Cosmos as read from the live Deepgram Playground, plus proposed voice-specific components: latency waterfall, end-of-turn chart, confidence transcript, model picker and code block, each with states, edge cases and an accessibility contract.",
};

const TOKENS: { name: string; hex: string; role: string; on?: string }[] = [
  { name: "page", hex: "#0B0B0C", role: "Page background" },
  { name: "card", hex: "#18181D", role: "Cards and fields" },
  { name: "raised", hex: "#2C2C33", role: "Card border, active nav row, text areas" },
  { name: "border", hex: "#4E4E52", role: "Decorative borders, disabled text" },
  { name: "border-control*", hex: "#66666C", role: "Proposed: interactive borders (3:1)" },
  { name: "outline", hex: "#88888C", role: "Secondary button outline" },
  { name: "text", hex: "#FBFBFF", role: "Primary text, primary button fill" },
  { name: "body", hex: "#D0D0D0", role: "Body text" },
  { name: "secondary", hex: "#BBBBBF", role: "Nav and secondary text" },
  { name: "green", hex: "#13EF93", role: "Selection, play, positive" },
  { name: "link", hex: "#79AFFA", role: "Links" },
  { name: "blue", hex: "#149AFB", role: "Gradient end" },
];

export default function CosmosPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <p className="eyebrow">Design · Cosmos+</p>
      <h1 className="display mt-1 text-3xl sm:text-4xl">Cosmos, extended for voice</h1>
      <p className="mt-2 max-w-3xl text-muted">Measured from the live Playground. Voice components are proposals.</p>

      <Section title="Foundations">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-card p-6">
            <h3 className="panel-title">Colour</h3>
            <ul className="mt-4 space-y-2">
              {TOKENS.map((t) => (
                <li key={t.name} className="flex items-center gap-3 text-sm">
                  <span aria-hidden="true" className="size-7 shrink-0 rounded border border-line" style={{ background: t.hex }} />
                  <span className="w-36 shrink-0 font-mono text-xs text-text">{t.name}</span>
                  <span className="flex-1 text-muted">{t.role}</span>
                  <span className="font-mono text-xs text-dim tnum">{contrast(t.hex, "#18181D").toFixed(2)}:1</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-dim">Contrast measured against the card surface. *Proposed token.</p>
          </div>
          <div className="rounded-lg border border-line bg-card p-6">
            <h3 className="panel-title">Type</h3>
            <dl className="mt-4 space-y-4">
              <Spec label="Heading · Roobert 700 · −0.02em · 1.25">
                <span className="display text-3xl">Voice AI, turn by turn</span>
              </Spec>
              <Spec label="Panel title · Roobert 400 · 18/28">
                <span className="panel-title">Voice Controls</span>
              </Spec>
              <Spec label="Segment · Roobert 600 · 14/20">
                <span className="font-[family-name:var(--font-roobert)] text-sm font-semibold text-text">Script · Code Sample</span>
              </Spec>
              <Spec label="UI · Inter 400/600 · 14/20">
                <span className="text-sm text-body">Lower replies sooner but cuts more people off.</span>
              </Spec>
              <Spec label="Code · Fira Code · 12">
                <span className="font-mono text-xs text-text">&quot;eot_threshold&quot;: 0.7</span>
              </Spec>
            </dl>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-line bg-card p-6">
          <h3 className="panel-title">Controls</h3>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={btn("primary")}>Free API Key</span>
            <span className={btn("secondary")}>Log in</span>
            <span className={btn("ghost")}>Console</span>
            <Badge>New</Badge>
            <Badge tone="amber">Proposed</Badge>
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-green text-raised">
              ▶
            </span>
          </div>
          <p className="mt-3 text-xs text-muted">Primary 15.1:1 · 4px corners · 36px tall.</p>
        </div>
      </Section>

      <Section title="Proposed voice components">
        <CosmosDemos />
      </Section>

      <Section title="Edge cases Cosmos doesn't answer yet">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Edge title="Control borders are under 3:1">#4e4e52 is 2.14:1 on cards. Proposed control border: #66666c (3.10:1).</Edge>
          <Edge title="Magenta fails as text on cards">#ef0074 is 4.06:1 on cards. Text uses #ff7ab8 (7.2:1).</Edge>
          <Edge title="Many categorical colours, one dark surface">Six latency stages: each gets a hue, a label and, where needed, a pattern.</Edge>
          <Edge title="Live data and screen readers">Charts update live; a status line summarises, values sit in text.</Edge>
          <Edge title="Pointer-only manipulation">Every draggable value also has a slider.</Edge>
          <Edge title="Proposed vs shipped">Unshipped features carry a “Proposed” badge.</Edge>
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

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-line pb-3 last:border-0">
      <dt className="font-mono text-xs text-dim">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  );
}

function Edge({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="rounded-lg border border-line bg-card p-5">
      <p className="font-semibold text-text">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </li>
  );
}
