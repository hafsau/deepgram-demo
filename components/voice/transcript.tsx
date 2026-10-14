import type { Word } from "@/lib/sessions";

/*
 * Transcript with word-level confidence. Low-confidence words get a dotted
 * underline and a screen-reader note, never colour alone. If the turn was
 * cut early, a marker shows exactly what the agent had heard.
 */

export const LOW_CONF = 0.8;

export function Transcript({ words, cutAfter }: { words: Word[]; cutAfter?: number | null }) {
  return (
    <p className="leading-relaxed text-text">
      {words.map((w, i) => (
        <span key={i}>
          <span className={w.conf < LOW_CONF ? "underline decoration-amber decoration-dotted decoration-2 underline-offset-4" : ""} title={`confidence ${w.conf.toFixed(2)}`}>
            {w.w}
            {w.conf < LOW_CONF && <span className="sr-only"> (low confidence {w.conf.toFixed(2)})</span>}
          </span>
          {cutAfter === i && (
            <span className="mx-1 inline-flex items-center rounded bg-red/15 px-1.5 font-mono text-xs font-semibold text-red">
              <span aria-hidden="true">✂</span>
              <span className="ml-1">agent replied here</span>
            </span>
          )}{" "}
        </span>
      ))}
    </p>
  );
}

/** Agent reply, with the part the caller never heard struck through. */
export function AgentReply({ text, heard }: { text: string; heard: number }) {
  if (heard >= 1) return <p className="leading-relaxed text-text">{text}</p>;
  const cut = Math.max(1, Math.round(text.length * heard));
  const at = text.lastIndexOf(" ", cut) > 0 ? text.lastIndexOf(" ", cut) : cut;
  return (
    <p className="leading-relaxed">
      <span className="text-text">{text.slice(0, at)}</span>
      <span className="mx-1 inline-flex items-center rounded bg-amber/15 px-1.5 font-mono text-xs font-semibold text-amber">heard up to here</span>
      <s className="text-dim">{text.slice(at)}</s>
      <span className="sr-only"> (the caller interrupted; the struck-through part was never played)</span>
    </p>
  );
}
