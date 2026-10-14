"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { btn } from "@/components/styles";
import { Badge } from "@/components/ui";
import { Panel } from "@/components/voice/controls";
import { usd } from "@/lib/cost";
import { CREDIT, DAYS_IN_MONTH, latencyByModel, REQUESTS, spend, TODAY, unitLabel, type Req } from "@/lib/usage";

/*
 * Usage that answers the questions developers actually ask: how fast is it
 * (p50 and p95, not averages), what will this month cost, and what happened
 * to *that* request. Budget alerts and project data settings are proposals;
 * they're labelled as such.
 */

const PAGE = 12;

export function Usage() {
  const id = useId();
  const s = spend();
  const lat = latencyByModel();
  const [model, setModel] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Req | null>(null);
  const [budgetOn, setBudgetOn] = useState(true);
  const [budget, setBudget] = useState(150);
  const [mip, setMip] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dg-usage-v1");
      if (raw) {
        const v = JSON.parse(raw);
        /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration */
        setBudgetOn(!!v.budgetOn);
        setBudget(Number(v.budget) || 150);
        setMip(!!v.mip);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("dg-usage-v1", JSON.stringify({ budgetOn, budget, mip }));
    } catch {
      /* ignore */
    }
  }, [budgetOn, budget, mip]);

  const rows = useMemo(() => REQUESTS.filter((r) => (model === "all" || r.model === model) && (status === "all" || (status === "errors" ? r.status !== 200 : r.status === 200))), [model, status]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const maxLat = Math.max(...lat.map((l) => l.p95));
  const budgetHitDay = s.perDay > 0 ? Math.ceil(budget / s.perDay) : null;

  return (
    <div className="mx-auto max-w-[1300px] px-4 py-6">
      <p className="eyebrow">Console · Usage</p>
      <h1 className="display mt-1 text-3xl text-text sm:text-4xl">Usage</h1>
      <p className="mt-2 max-w-3xl text-muted">Oct 1–{TODAY}, 2026 · synthetic data</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section aria-labelledby={`${id}-spend`} className="rounded-lg border border-line bg-card p-5 sm:p-6 lg:col-span-2">
          <h2 id={`${id}-spend`} className="panel-title flex flex-wrap items-center gap-2">
            Spend against your credit
          </h2>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="font-display text-3xl font-bold tnum">
              {usd(s.used)} <span className="text-base font-normal text-muted">of {usd(CREDIT, 0)} credit</span>
            </p>
            <p className="text-sm text-muted">
              About <span className="text-text tnum">{usd(s.perDay)}</span> a day
            </p>
          </div>
          <div className="relative mt-3 h-3 rounded-full bg-surface" role="img" aria-label={`${Math.round((s.used / CREDIT) * 100)}% of credit used; projected ${Math.round((s.projected / CREDIT) * 100)}% by the end of the month`}>
            <span className="absolute inset-y-0 left-0 rounded-full bg-green" style={{ width: `${Math.min(100, (s.used / CREDIT) * 100)}%` }} />
            <span className="hatch absolute inset-y-0 rounded-r-full text-green/50" style={{ left: `${Math.min(100, (s.used / CREDIT) * 100)}%`, width: `${Math.min(100, ((s.projected - s.used) / CREDIT) * 100)}%` }} />
            {budgetOn && <span className="absolute inset-y-[-4px] w-0.5 bg-amber" style={{ left: `${Math.min(100, (budget / CREDIT) * 100)}%` }} />}
          </div>
          <p className="mt-2 text-sm text-text">
            At this pace you&apos;ll spend <b className="tnum">{usd(s.projected)}</b> by Oct {DAYS_IN_MONTH}. Credit lasts about <b className="tnum">{s.daysLeft}</b> more days.
          </p>
          <div className="mt-4 rounded-lg border border-line bg-bg p-4">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              Budget alert <Badge tone="amber">Proposed</Badge>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={budgetOn} onChange={(e) => setBudgetOn(e.target.checked)} className="size-4 accent-[var(--green)]" />
                Email owners when monthly spend reaches
              </label>
              <label className="sr-only" htmlFor={`${id}-budget`}>
                Budget in dollars
              </label>
              <span className="inline-flex items-center rounded-md border border-line-strong bg-card px-2">
                <span className="text-muted">$</span>
                <input id={`${id}-budget`} type="number" min={1} value={budget} disabled={!budgetOn} onChange={(e) => setBudget(Math.max(1, Number(e.target.value) || 1))} className="min-h-10 w-20 bg-transparent px-1 text-sm tnum" />
              </span>
            </div>
            <p role="status" className="mt-1 text-xs text-muted">
              {budgetOn ? (budgetHitDay && budgetHitDay <= DAYS_IN_MONTH ? `At this pace you'll reach ${usd(budget, 0)} around Oct ${budgetHitDay}.` : `You won't reach ${usd(budget, 0)} this month at this pace.`) : "No alert set."}
            </p>
          </div>
        </section>

        <section aria-labelledby={`${id}-data`} className="rounded-lg border border-line bg-card p-5 sm:p-6">
          <h2 id={`${id}-data`} className="panel-title flex flex-wrap items-center gap-2">
            Project data settings <Badge tone="amber">Proposed</Badge>
          </h2>
          
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
            <input type="checkbox" checked={mip} onChange={(e) => setMip(e.target.checked)} className="mt-0.5 size-4 accent-[var(--green)]" />
            <span>
              <span className="block text-sm font-semibold">Opt out of model improvement</span>
              <span className="block text-xs text-muted">Sets mip_opt_out on every request.</span>
            </span>
          </label>
          <div className="mt-3 rounded-lg border border-line p-3">
            <p className="text-sm font-semibold">Request logs</p>
            <p className="text-xs text-muted">Kept 90 days. Export CSV for longer.</p>
          </div>
        </section>
      </div>

      <div className="mt-4">
      <Panel title="Latency by model" id={`${id}-lat`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <caption className="sr-only">Latency percentiles, error rate and spend for each model</caption>
            <thead className="text-xs text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Model
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Requests
                </th>
                <th scope="col" className="w-[38%] py-2 pr-3 font-medium">
                  Latency (p50 ● p95 ▲)
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Errors
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Spend
                </th>
              </tr>
            </thead>
            <tbody className="tnum">
              {lat.map((l) => (
                <tr key={l.model} className="border-t border-line">
                  <th scope="row" className="py-2.5 pr-3 font-normal">
                    <span className="block font-mono text-xs text-text">{l.model}</span>
                    <span className="text-xs text-muted">{l.product}</span>
                  </th>
                  <td className="py-2.5 pr-3 text-right">{l.requests}</td>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-3">
                      <span className="relative h-2 flex-1 rounded-full bg-surface" aria-hidden="true">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-link/30" style={{ width: `${(l.p95 / maxLat) * 100}%` }} />
                        <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-link" style={{ left: `${(l.p50 / maxLat) * 100}%` }} />
                        <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs leading-none text-pink" style={{ left: `${(l.p95 / maxLat) * 100}%` }}>
                          ▲
                        </span>
                      </span>
                      <span className="w-32 shrink-0 font-mono text-xs">
                        {l.p50} / <span className="text-pink">{l.p95}</span> ms
                      </span>
                    </span>
                  </td>
                  <td className={`py-2.5 pr-3 text-right ${l.errorRate > 2 ? "text-amber" : ""}`}>{l.errorRate}%</td>
                  <td className="py-2.5 text-right">{usd(l.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">p95: what one caller in twenty waits.</p>
      </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Requests" id={`${id}-req`}>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor={`${id}-m`} className="block text-xs font-semibold">
                Model
              </label>
              <select id={`${id}-m`} value={model} onChange={(e) => (setModel(e.target.value), setPage(0))} className="mt-1.5 h-10 rounded-[4px] border border-line-strong bg-card px-2.5 text-sm text-muted">
                <option value="all">All models</option>
                {lat.map((l) => (
                  <option key={l.model} value={l.model}>
                    {l.model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${id}-s`} className="block text-xs font-semibold">
                Status
              </label>
              <select id={`${id}-s`} value={status} onChange={(e) => (setStatus(e.target.value), setPage(0))} className="mt-1.5 h-10 rounded-[4px] border border-line-strong bg-card px-2.5 text-sm text-muted">
                <option value="all">All</option>
                <option value="ok">Succeeded</option>
                <option value="errors">Errors</option>
              </select>
            </div>
            <p role="status" className="ml-auto text-sm text-muted">
              {rows.length} requests
            </p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Request log</caption>
              <thead className="text-xs text-muted">
                <tr>
                  {["Time (UTC)", "Model", "Audio / text", "Latency", "Status", "Cost", ""].map((h, i) => (
                    <th key={i} scope="col" className={`py-2 pr-3 font-medium ${[3, 5].includes(i) ? "text-right" : ""}`}>
                      {h || <span className="sr-only">Details</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tnum">
                {shown.map((q) => (
                  <tr key={q.id} className="border-t border-line">
                    <td className="py-2 pr-3 font-mono text-xs text-muted">{q.at.slice(5, 16).replace("T", " ")}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{q.model}</td>
                    <td className="py-2 pr-3 text-muted">{unitLabel(q)}</td>
                    <td className={`py-2 pr-3 text-right font-mono text-xs ${q.latencyMs > 1500 ? "text-amber" : ""}`}>{q.latencyMs} ms</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-1.5 py-0.5 font-mono text-xs ${q.status === 200 ? "bg-green/10 text-green" : "bg-red/10 text-red"}`}>{q.status}</span>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-xs">{usd(q.cost, 4)}</td>
                    <td className="py-2">
                      <button type="button" onClick={() => setOpen(q)} className="h-8 rounded-[4px] px-2 text-xs text-link hover:bg-raised">
                        Inspect<span className="sr-only"> {q.id}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className={btn("secondary")}>
              Previous
            </button>
            <span className="text-muted">
              Page {page + 1} of {pages}
            </span>
            <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} className={btn("secondary")}>
              Next
            </button>
          </div>
          {open && (
            <section aria-label={`Request ${open.id}`} className="mt-4 rounded-lg border border-line bg-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-mono text-sm">{open.id}</h3>
                <button type="button" onClick={() => setOpen(null)} className="min-h-9 rounded-md px-3 text-xs text-muted hover:bg-card hover:text-text">
                  Close
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["Product", open.product],
                  ["Model", open.model],
                  ["Mode", open.mode],
                  ["Status", String(open.status)],
                  ["Latency", `${open.latencyMs} ms`],
                  ["Billed", usd(open.cost, 4)],
                  ["Units", unitLabel(open)],
                  ["Tags", open.tags.join(", ")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="font-mono text-xs">{v}</dd>
                  </div>
                ))}
              </dl>
              {open.status !== 200 && (
                <p className="mt-3 rounded-md bg-red/10 p-2 text-sm text-text">
                  {open.status === 429 ? "Rate limited. Retry with backoff." : open.status === 401 ? "Invalid or expired key." : "An option isn't valid for this model (e.g. smart_format with Flux)."}
                </p>
              )}
              {open.product === "Voice Agent" && (
                <Link href="/?s=pizza" className="link mt-3 inline-block text-sm">
                  Open a similar session in the Playground
                </Link>
              )}
            </section>
          )}
        </Panel>
      </div>
    </div>
  );
}
