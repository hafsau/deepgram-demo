"use client";

import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { btn, type Variant } from "@/components/styles";


/*
 * Cosmos primitives, matched to the live Playground:
 *  - Buttons: Inter 600 14px, 4px corners, 36px tall. Primary is #fbfbff on
 *    #232329; secondary is a 1px #88888c outline; ghost is text-only.
 *  - Segmented control: active pill #fbfbff with Roobert 600, 8px corners.
 *  - Badge: pill with a green border on green at 20%.
 *  - Selectable row: 1px border, 8px corners, green border when selected.
 */

export function Button({ variant = "primary", className = "", ...p }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={btn(variant, className)} {...p} />;
}
export function LinkButton({ variant = "primary", className = "", ...p }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={btn(variant, className)} {...p} />;
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  const name = useId();
  return (
    <fieldset className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-line-cosmos p-1">
      <legend className="sr-only">{label}</legend>
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="peer sr-only" />
          <span className="flex h-8 items-center rounded-lg px-3 font-[family-name:var(--font-roobert)] text-sm font-semibold text-muted peer-checked:bg-btn peer-checked:text-raised peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green hover:text-text peer-checked:hover:text-raised">
            {o.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" | "neutral" }) {
  const t = {
    green: "border-green bg-green/20 text-text",
    amber: "border-amber bg-amber/15 text-text",
    red: "border-red bg-red/15 text-text",
    neutral: "border-line-strong bg-raised text-muted",
  }[tone];
  return <span className={`inline-flex h-5 items-center rounded-full border px-2 text-xs ${t}`}>{children}</span>;
}

