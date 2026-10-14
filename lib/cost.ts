/*
 * Public pay-as-you-go prices (deepgram.com/pricing, October 2026).
 * Voice Agent API is billed per minute of session; standard tier shown.
 */
export const PRICES = {
  voiceAgentStandardPerMin: 0.075,
  freeCredit: 200,
} as const;

export function sessionCost(durationSec: number): number {
  return round4((durationSec / 60) * PRICES.voiceAgentStandardPerMin);
}

export function per1000Calls(durationSec: number): number {
  return Math.round(sessionCost(durationSec) * 1000 * 100) / 100;
}

/** How many calls of this length the free credit covers. */
export function callsOnFreeCredit(durationSec: number): number {
  const c = sessionCost(durationSec);
  return c > 0 ? Math.floor(PRICES.freeCredit / c) : 0;
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

export function usd(n: number, digits = 2): string {
  return `$${n.toFixed(digits)}`;
}
