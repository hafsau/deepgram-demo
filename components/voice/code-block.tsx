"use client";

import { useId, useState } from "react";

/*
 * Code block with language tabs and copy. Keys are never inlined: generated
 * code reads DEEPGRAM_API_KEY, and the block says so next to the copy button.
 */

export function CodeBlock({ tabs, note }: { tabs: { id: string; label: string; code: string }[]; note?: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const [copied, setCopied] = useState(false);
  const id = useId();
  const cur = tabs.find((t) => t.id === active) ?? tabs[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cur.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = tabs[(i + d + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${id}-tab-${next.id}`)?.focus();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-bg">
      <div className="flex items-center justify-between gap-2 border-b border-line p-2">
        <div role="tablist" aria-label="Language" className="flex gap-1">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              id={`${id}-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active === t.id}
              aria-controls={`${id}-panel`}
              tabIndex={active === t.id ? 0 : -1}
              onKeyDown={(e) => onKey(e, i)}
              onClick={() => setActive(t.id)}
              className={`h-8 rounded-lg px-3 font-[family-name:var(--font-roobert)] text-sm font-semibold ${active === t.id ? "bg-btn text-raised" : "text-muted hover:text-text"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={copy} className="h-8 rounded-[4px] border border-outline px-3 text-xs font-semibold text-text hover:bg-raised">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${cur.id}`} tabIndex={0} className="max-h-[420px] overflow-auto p-3 font-mono text-[12px] leading-relaxed text-text">
        <code>{cur.code}</code>
      </pre>
      <p className="sr-only" role="status">
        {copied ? "Copied to clipboard" : ""}
      </p>
      {note && <p className="border-t border-line px-3 py-2 text-xs text-muted">{note}</p>}
    </div>
  );
}
