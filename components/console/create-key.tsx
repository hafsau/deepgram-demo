"use client";

import { useEffect, useId, useRef, useState } from "react";
import { btn, selectable } from "@/components/styles";
import { Panel } from "@/components/voice/controls";
import { CAPABILITY_LABEL, capabilities, excess, maskKey, missing, ROLE_LABEL, USE_CASES, type Capability, type Role, type UseCase } from "@/lib/keys";

/*
 * Create an API key, designed around the failures people hit:
 *  - choosing a role that can't do the job (FORBIDDEN on temp tokens),
 *  - over-privileged keys that live forever,
 *  - losing a secret that's only shown once.
 */

const EXPIRY: { value: number | null; label: string }[] = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 365, label: "1 year" },
  { value: null, label: "Never" },
];

export function CreateKey() {
  const id = useId();
  const [useCase, setUseCase] = useState<UseCase>("browser");
  const [role, setRole] = useState<Role>(USE_CASES.browser.role);
  const [name, setName] = useState("web-app-token-server");
  const [tags, setTags] = useState("prod");
  const [expiry, setExpiry] = useState<number | null>(USE_CASES.browser.expiryDays);
  const [nameErr, setNameErr] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stored, setStored] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const seq = useRef(7);

  const miss = missing(useCase, role);
  const extra = excess(useCase, role);
  const caps = capabilities(role);

  const pickUseCase = (u: UseCase) => {
    setUseCase(u);
    setRole(USE_CASES[u].role);
    setExpiry(USE_CASES[u].expiryDays);
  };

  const create = () => {
    if (!name.trim()) {
      setNameErr("Give the key a name you'll recognise in logs.");
      document.getElementById(`${id}-name`)?.focus();
      return;
    }
    if (miss.length) return;
    seq.current += 1;
    setSecret(`dg_demo_${(seq.current * 2654435761).toString(16).padStart(8, "0")}${"4f9c2a7e1b3d5f80".slice(0, 16)}`);
    setRevealed(false);
    setStored(false);
    setCopied(false);
  };

  useEffect(() => {
    if (secret) dialog.current?.showModal();
  }, [secret]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <p className="eyebrow">Console · API keys</p>
      <h1 className="display mt-1 text-3xl text-text sm:text-4xl">Create an API key that works the first time</h1>
      <p className="mt-2 max-w-3xl text-muted">Start from what the key is for. Console picks the least-privileged role that can do it, and says what the key can and can&apos;t do before it exists.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel title="1. What will this key do?" id={`${id}-uc`}>
            <fieldset>
              <legend className="sr-only">Use case</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(USE_CASES) as UseCase[]).map((u) => (
                  <label key={u} className={selectable(useCase === u)}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name={`${id}-uc`} checked={useCase === u} onChange={() => pickUseCase(u)} className="size-4 accent-[var(--green)]" />
                      <span className="text-sm font-semibold text-text">{USE_CASES[u].label}</span>
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-muted">{USE_CASES[u].detail}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Panel>

          <Panel title="2. Permissions" id={`${id}-perm`}>
            <label htmlFor={`${id}-role`} className="block text-xs font-semibold">
              Role
            </label>
            <select id={`${id}-role`} value={role} onChange={(e) => setRole(e.target.value as Role)} aria-describedby={miss.length ? `${id}-miss` : undefined} className="mt-1 h-11 w-full max-w-xs rounded-[4px] border border-line-strong bg-card px-2.5 text-sm text-muted">
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                  {r === USE_CASES[useCase].role ? " (recommended)" : ""}
                  {r === "custom" ? ": usage:read" : ""}
                </option>
              ))}
            </select>
            {miss.length > 0 && (
              <div id={`${id}-miss`} role="alert" className="mt-3 rounded-md border border-red/50 bg-red/10 p-3 text-sm">
                <p className="font-semibold text-red">This key can&apos;t do what you picked it for.</p>
                <p className="mt-1 text-text">
                  {ROLE_LABEL[role]} can&apos;t {miss.map((m) => CAPABILITY_LABEL[m].toLowerCase()).join(" or ")}. Requests would fail with <code className="font-mono text-red">FORBIDDEN</code>.{" "}
                  {miss.includes("tempTokens") && "Temporary tokens need a key with Member role or higher."}
                </p>
                <button type="button" onClick={() => setRole(USE_CASES[useCase].role)} className={btn("secondary", "mt-2")}>
                  Use {ROLE_LABEL[USE_CASES[useCase].role]} instead
                </button>
              </div>
            )}
            {extra.length > 0 && miss.length === 0 && (
              <p className="mt-3 rounded-md border border-amber/40 bg-amber/10 p-3 text-sm text-text">
                <span className="font-semibold text-amber">More access than this needs:</span> {extra.map((c) => CAPABILITY_LABEL[c].toLowerCase()).join(", ")}. A leaked key could do this too.
              </p>
            )}
            <ul className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2" aria-label="What this key can do">
              {(Object.keys(CAPABILITY_LABEL) as Capability[]).map((c) => {
                const needed = USE_CASES[useCase].needs.includes(c);
                return (
                  <li key={c} className="flex items-center gap-2 text-sm">
                    <span aria-hidden="true" className={`grid size-5 place-items-center rounded-full text-xs font-bold ${caps[c] ? "bg-green/15 text-green" : needed ? "bg-red/15 text-red" : "bg-surface text-dim"}`}>
                      {caps[c] ? "✓" : "✕"}
                    </span>
                    <span className={caps[c] ? "text-text" : needed ? "text-red" : "text-dim"}>{CAPABILITY_LABEL[c]}</span>
                    <span className="sr-only">{caps[c] ? "allowed" : "not allowed"}</span>
                    {needed && <span className="rounded bg-surface px-1.5 font-mono text-xs text-muted">needed</span>}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="3. Details" id={`${id}-details`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-name`} className="block text-xs font-semibold">
                  Friendly name
                </label>
                <input
                  id={`${id}-name`}
                  value={name}
                  onChange={(e) => (setName(e.target.value), setNameErr(""))}
                  aria-invalid={nameErr ? true : undefined}
                  aria-describedby={nameErr ? `${id}-name-err` : undefined}
                  className="mt-1.5 h-11 w-full rounded-[4px] border border-line-strong bg-card px-2.5 text-sm text-muted"
                />
                {nameErr && (
                  <p id={`${id}-name-err`} className="mt-1 text-xs text-red">
                    {nameErr}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor={`${id}-tags`} className="block text-xs font-semibold">
                  Tags
                </label>
                <input id={`${id}-tags`} value={tags} onChange={(e) => setTags(e.target.value)} aria-describedby={`${id}-tags-hint`} className="mt-1.5 h-11 w-full rounded-[4px] border border-line-strong bg-card px-2.5 text-sm text-muted" />
                <p id={`${id}-tags-hint`} className="mt-1 text-xs text-amber">
                  Tags can&apos;t be changed after the key is created.
                </p>
              </div>
            </div>
            <fieldset className="mt-4">
              <legend className="text-xs font-semibold">Expires</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {EXPIRY.map((x) => (
                  <label key={x.label} className={`flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${expiry === x.value ? "border-green text-text" : "border-line-strong"}`}>
                    <input type="radio" name={`${id}-exp`} checked={expiry === x.value} onChange={() => setExpiry(x.value)} className="size-4 accent-[var(--green)]" />
                    {x.label}
                    {x.value === USE_CASES[useCase].expiryDays && <span className="font-mono text-xs text-green">recommended</span>}
                  </label>
                ))}
              </div>
              {expiry === null && <p className="mt-2 text-xs text-amber">Keys that never expire are the ones that leak. Set a reminder to rotate it.</p>}
            </fieldset>
          </Panel>

          <button type="button" onClick={create} aria-disabled={miss.length > 0} className={btn("primary", miss.length ? "cursor-not-allowed opacity-40" : "")}>
            Create key
          </button>
        </div>

        <aside aria-label="Summary" className="lg:sticky lg:top-20 lg:self-start">
          <Panel title="Summary" id={`${id}-sum`}>
            <dl className="space-y-2 text-sm">
              {[
                ["Name", name || "–"],
                ["Use", USE_CASES[useCase].label],
                ["Role", ROLE_LABEL[role]],
                ["Expires", EXPIRY.find((x) => x.value === expiry)?.label ?? "–"],
                ["Tags", tags || "–"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line pb-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
            <p className={`mt-3 text-sm font-semibold ${miss.length ? "text-red" : "text-green"}`}>{miss.length ? "Won't work for this use case" : "Ready to create"}</p>
          </Panel>
        </aside>
      </div>

      <dialog ref={dialog} aria-labelledby={`${id}-dlg`} onCancel={(e) => !stored && e.preventDefault()} className="m-auto w-[min(560px,calc(100vw-32px))] rounded-lg border border-line bg-card p-6 text-text backdrop:bg-black/70">
        <h2 id={`${id}-dlg`} className="display text-xl">
          Copy your key now
        </h2>
        <p className="mt-1 text-sm text-muted">This is the only time the secret is shown. Store it in your secret manager or .env file.</p>
        {secret && (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-surface p-2">
              <code className="flex-1 truncate font-mono text-sm" aria-label={revealed ? "API key secret" : "API key secret, hidden"}>
                {revealed ? secret : maskKey(secret)}
              </code>
              <button type="button" onClick={() => setRevealed((r) => !r)} className="min-h-9 rounded-md px-3 text-xs font-semibold text-muted hover:bg-card hover:text-text">
                {revealed ? "Hide" : "Reveal"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(secret);
                    setCopied(true);
                  } catch {
                    setRevealed(true);
                  }
                }}
                className={btn("primary", "h-8 text-xs")}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-3 rounded-md bg-surface p-2 font-mono text-xs text-muted">DEEPGRAM_API_KEY={maskKey(secret)}</pre>
            <p role="status" className="sr-only">
              {copied ? "Key copied" : ""}
            </p>
            <label className="mt-4 flex min-h-10 cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={stored} onChange={(e) => setStored(e.target.checked)} className="size-4 accent-[var(--green)]" />
              I&apos;ve stored this key somewhere safe
            </label>
            <button type="button" disabled={!stored} onClick={() => (dialog.current?.close(), setSecret(null))} className={btn("primary", "mt-3 w-full")}>
              Done
            </button>
            <p className="mt-2 text-xs text-dim">Demo secret, not a real key.</p>
          </>
        )}
      </dialog>
    </div>
  );
}
