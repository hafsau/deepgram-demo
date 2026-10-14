/*
 * Cosmos class helpers. Plain functions with no client code, so server and
 * client components can both use them.
 *  - Buttons: Inter 600 14px, 4px corners, 36px tall. Primary #fbfbff on
 *    #232329; secondary 1px #88888c outline; ghost text-only.
 *  - Selectable rows: 1px border, 8px corners, green border when selected.
 */
export type Variant = "primary" | "secondary" | "ghost";
const VARIANT: Record<Variant, string> = {
  primary: "bg-btn text-btn-text hover:bg-white",
  secondary: "border border-outline text-text hover:bg-raised",
  ghost: "text-muted hover:bg-raised hover:text-text",
};
export const btn = (v: Variant = "primary", extra = "") => `inline-flex h-9 items-center justify-center gap-2 rounded-[4px] px-3 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[v]} ${extra}`;


/** Class for selectable rows/cards (radio labels). */
export const selectable = (on: boolean) => `block cursor-pointer rounded-lg border p-3 ${on ? "border-green" : "border-line-strong hover:border-outline"}`;
