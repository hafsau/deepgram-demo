"use client";

import { useId, type ReactNode } from "react";

/* Small, consistent form controls for the dark system. */

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm text-text">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format, hint, disabled }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string; hint?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-text">
          {label}
        </label>
        <span className="font-mono text-xs text-green tnum">{format(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-valuetext={format(value)} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 h-6 w-full" />
      {hint && <p className="text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

export function Select<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; hint?: ReactNode }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="mt-1.5 h-11 w-full rounded-[4px] border border-line-strong bg-card px-2.5 text-sm text-muted">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/* Cosmos card: #18181d, 1px #2c2c33, 8px corners, 24px padding; Roobert 400 18/28 title. */
export function Panel({ title, children, actions, id }: { title: string; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="rounded-lg border border-line bg-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="panel-title">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
