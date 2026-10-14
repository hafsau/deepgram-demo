"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DeepgramLogo } from "@/components/brand";
import { btn } from "@/components/styles";

/*
 * App chrome modelled on the live Playground: a slim top bar (logo, quiet
 * links, one white primary action) and an "Explore"-style left sidebar with
 * 14px items and a #2c2c33 active row.
 */

const GROUPS = [
  {
    title: "Explore",
    items: [
      { href: "/", label: "Voice Agent replay", icon: "M4 12h2l2-6 4 12 3-9 2 3h3" },
      { href: "/live", label: "Live mic", icon: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v2" },
    ],
  },
  {
    title: "Console",
    items: [
      { href: "/console/keys", label: "API keys", icon: "M15 7a4 4 0 1 1-3.9 5H7v3H4v-3h-.5M15 7h.01" },
      { href: "/console/usage", label: "Usage", icon: "M4 20V10m6 10V4m6 16v-7m4 7H3" },
    ],
  },
  {
    title: "Design",
    items: [
      { href: "/cosmos", label: "Cosmos+ components", icon: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" },
      { href: "/notes", label: "Notes and handoff", icon: "M6 3h9l3 3v15H6V3Zm3 7h6m-6 4h6m-6 4h4" },
    ],
  },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close the menu on navigation
  useEffect(() => setOpen(false), [pathname]);
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Primary" className="py-3">
      {GROUPS.map((g) => (
        <div key={g.title} className="mb-4">
          <p className="px-4 pb-1 text-sm font-semibold text-text">{g.title}</p>
          <ul>
            {g.items.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isCurrent(n.href) ? "page" : undefined} className={`flex h-9 items-center gap-2.5 px-4 text-sm ${isCurrent(n.href) ? "bg-raised text-text" : "text-muted hover:bg-raised/60 hover:text-text"}`}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={n.icon} />
                  </svg>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-btn focus:px-4 focus:py-2 focus:font-semibold focus:text-btn-text">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-bg">
        <div className="flex h-14 items-center gap-4 px-4">
          <button type="button" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)} className="inline-flex size-9 items-center justify-center rounded text-muted hover:bg-raised hover:text-text lg:hidden">
            <span className="sr-only">Menu</span>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
          <Link href="/" className="flex h-9 items-center gap-3 rounded" aria-label="Turn by Turn, a Deepgram Playground concept, home">
            <DeepgramLogo className="h-[22px] w-auto text-text" />
          </Link>
          <span className="hidden text-sm text-muted sm:inline">
            Playground concept · <span className="text-green">Turn by Turn</span>
          </span>
          <div className="ml-auto flex items-center gap-5">
            <a href="https://hafsausmani.com" className="hidden text-sm text-link sm:inline">
              Hafsa Usmani
            </a>
            <Link href="/notes" className={btn("primary")}>
              Read the notes
            </Link>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-line lg:block">
          <div className="sticky top-14">{nav}</div>
        </aside>
        {open && (
          <div id="mobile-nav" className="fixed inset-x-0 top-14 z-30 border-b border-line bg-bg lg:hidden">
            {nav}
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <footer className="border-t border-line">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-xs text-muted">
              <p>
                An unofficial concept by{" "}
                <a href="https://hafsausmani.com" className="link">
                  Hafsa Usmani
                </a>{" "}
                for Deepgram&apos;s Product Designer II role. Not affiliated with Deepgram. Sessions are synthetic; component timings are illustrative.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
