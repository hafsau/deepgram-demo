# Turn by Turn

**▶ Live: [deepgram-demo-kappa.vercel.app](https://deepgram-demo-kappa.vercel.app)** · [Live mic](https://deepgram-demo-kappa.vercel.app/live) · [Cosmos+](https://deepgram-demo-kappa.vercel.app/cosmos) · [Notes](https://deepgram-demo-kappa.vercel.app/notes) · [![CI](https://github.com/hafsau/deepgram-demo/actions/workflows/ci.yml/badge.svg)](https://github.com/hafsau/deepgram-demo/actions/workflows/ci.yml)

**A Deepgram Playground concept that makes real time visible.** An unofficial concept by [Hafsa Usmani](https://hafsausmani.com) for Deepgram's **Product Designer II** role (Playground and Console, on Cosmos).

> **Not affiliated with Deepgram.** Recorded sessions are synthetic and component timings are illustrative. Parameter names, ranges, message shapes, pricing and Cosmos styles are taken from Deepgram's public docs and live product, October 2026.

## The idea

Voice agents fail in the gaps between words. A caller pauses to think and the agent jumps in, or the agent waits a beat too long and feels slow. Deepgram's Voice Agent API already reports per-turn latency (`LatencyReport`), and Flux exposes end-of-turn confidence, but no UI shows either.

Turn by Turn is a Playground session view built around that. It also answers [deepgram/examples#304](https://github.com/deepgram/examples/issues/304): word timings, latency display, a request inspector, and shareable config URLs.

## What's in it

| | |
|---|---|
| **Voice Agent replay** (`/`) | Three recorded calls. Tune `eot_threshold`, eager end-of-turn, `eot_timeout_ms`, Flux vs Nova-3 endpointing, LLM, voice and speed, and watch every turn change: a per-turn latency **waterfall** (overlapping stages, headline time to first audio), an **end-of-turn chart** with the confidence curve under the real words and a draggable threshold, "cut early" markers, a barge-in lane showing what the caller actually heard, p50/p95, an **event inspector** with Voice Agent message names, **Get code** (Settings JSON, Node, Python) generated from the UI, a cost tab, and a **share link** for every state. |
| **Live mic** (`/live`) | A real silence-timer turn detector running on your mic, free. Optionally, bring your own key: stream to Flux and plot live end-of-turn confidence against the threshold. The key stays in tab memory and is sent only to `api.deepgram.com`. |
| **API keys** (`/console/keys`) | Key creation that starts from the job. Least-privilege role picked for you, capabilities shown before the key exists. The temporary-token **FORBIDDEN trap** is blocked up front. Expiry recommendations, tags-are-permanent warning, and a one-time secret reveal you must acknowledge. |
| **Usage** (`/console/usage`) | Spend against credit with a run-out projection, a **budget alert** (proposed), latency p50/p95 per model, a filterable request log with an inspector, and project-level data settings (proposed). |
| **Cosmos+** (`/cosmos`) | Cosmos foundations measured from the live Playground. Proposed voice components with states, an accessibility contract and a "why". Edge cases the system doesn't answer yet (e.g. the control-border contrast). |
| **Notes** (`/notes`) | Decision log with the directions that lost, a handoff spec for the threshold control, how AI was used, and what's real vs illustrative. |

## How the replay engine works

`lib/engine.ts` is pure and unit-tested.

- **Flux turns:** each user turn has word timings plus a "how finished does this sound" score at word boundaries, which become an end-of-turn confidence curve. `EndOfTurn` fires where the curve crosses `eot_threshold`, or after `eot_timeout_ms`.
- **Eager end-of-turn:** with `eager_eot_threshold` set, the LLM starts early, audio is held until the turn is confirmed, and `defer_until_eot` tools wait.
- **Nova-3 turns:** endpointing is a silence timer.
- **Output:** the result per turn has the `LatencyReport` field names (`stt_latency`, `ttt_token_latency`, `ttt_text_latency`, `ttt_tool_latency`, `tts_latency`, `total_latency`).

## Design system fidelity

Tokens are read from `playground.deepgram.com` computed styles:

- **Colors:** page #0b0b0c, cards #18181d with #2c2c33 borders, text #fbfbff / #d0d0d0 / #bbbbbf, green #13ef93, links #79affa.
- **Shape:** 8px cards, 4px buttons.
- **Buttons:** white primary with #232329 text, Inter 600 14px, 36px tall. Segmented controls use Roobert 600.
- **Type:** Roobert 400/500/700, proxied same-origin from Deepgram's CDN (`next.config.ts`), plus Inter and Fira Code.

## Quality gates

- **Vitest (23 tests):**
  - turn detection, eager speculation and deferred tools;
  - barge-in;
  - LatencyReport math and nearest-rank percentiles;
  - event ordering;
  - share-link round trip and clamping;
  - code generation (exact params, no inlined keys);
  - pricing, key-permission rules, usage projections;
  - Cosmos contrast.
- **Playwright + axe (34 tests):**
  - zero WCAG 2.2 AA violations on every page and key state;
  - keyboard tuning removes the cut-off and updates the URL;
  - share links restore state;
  - Get code matches the UI;
  - the FORBIDDEN trap is blocked and the secret is acknowledged;
  - usage filter and inspector;
  - a denied mic is explained;
  - no horizontal scroll at three sizes.
- **Lighthouse CI:** accessibility 100 on all six pages, CLS ≈ 0, performance 98–99.

## Run it

```bash
npm install
npm run dev
npm test
npm run e2e
```

**Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Vitest, Playwright, axe-core, and Vercel Analytics.
