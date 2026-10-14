/*
 * Recorded voice-agent sessions (synthetic). Each user turn is a list of words
 * with timings, plus a "completeness" score at selected word boundaries: how
 * finished the utterance sounds if the user stopped there. The replay engine
 * turns that into an end-of-turn confidence curve, the same kind of signal
 * Flux exposes, so the threshold can be tuned against realistic hesitations.
 */

export type Word = {
  w: string;
  /** Seconds from the start of the user's turn. */
  s: number;
  e: number;
  /** Recognition confidence 0–1. */
  conf: number;
  /** How complete the utterance sounds if it ends after this word (0–1). Default 0.12. */
  done?: number;
};

export type AgentReply = {
  text: string;
  /** LLM time to first token, seconds, on the fast model. */
  llm: number;
  /** Seconds of reply audio at speed 1.0. */
  speak: number;
  tool?: { name: string; args: Record<string, unknown>; defer?: boolean };
};

export type Exchange = {
  /** Seconds between the end of the previous agent audio and the user starting. Negative = the user barges in. */
  gap: number;
  words: Word[];
  agent: AgentReply;
};

export type Session = {
  id: string;
  title: string;
  blurb: string;
  prompt: string;
  greeting: { text: string; speak: number };
  exchanges: Exchange[];
};

/** Build words from a compact spec: "word|dur|pause|done" separated by spaces. */
function say(spec: string, conf: number[] = []): Word[] {
  let t = 0;
  return spec
    .trim()
    .split(/\s+/)
    .map((tok, i) => {
      const [w, d = "0.28", p = "0.06", done] = tok.split("|");
      const s = t;
      const e = s + Number(d);
      t = e + Number(p);
      return { w: w.replace(/_/g, " "), s: round(s), e: round(e), conf: conf[i] ?? 0.96, ...(done ? { done: Number(done) } : {}) };
    });
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

export const SESSIONS: Session[] = [
  {
    id: "pizza",
    title: "Pizza order",
    blurb: "A pause mid-order.",
    prompt: "You take phone orders for Slice House. Confirm size, toppings and pickup time. Keep replies under two sentences.",
    greeting: { text: "Hi, thanks for calling Slice House. What can I get started for you?", speak: 3.4 },
    exchanges: [
      {
        gap: 0.7,
        words: say("Hi,|0.22|0.08 yeah,|0.3|0.1 can|0.18 I|0.1 get|0.2 a|0.12 large|0.34|0.72|0.78 um…|0.4|0.38|0.55 pepperoni|0.52|0.05 with|0.16 extra|0.3 cheese?|0.5|0|0.94", [0.97, 0.91, 0.98, 0.99, 0.98, 0.97, 0.99, 0.62, 0.98, 0.96, 0.97, 0.95]),
        agent: { text: "One large pepperoni with extra cheese. Is that for pickup or delivery?", llm: 0.34, speak: 3.6 },
      },
      {
        gap: 0.6,
        words: say("Pickup.|0.5|0|0.9"),
        agent: { text: "Great. What name should I put it under, and when would you like it?", llm: 0.3, speak: 3.3 },
      },
      {
        gap: 0.5,
        words: say("It's|0.2 for|0.16 Dana,|0.42|0.55|0.7 and|0.18|0.12 maybe…|0.46|0.6|0.62 around|0.32 six|0.3 thirty.|0.5|0|0.93", [0.97, 0.98, 0.9, 0.98, 0.88, 0.97, 0.99, 0.96]),
        agent: { text: "Got it, Dana at six thirty. Your total is twenty-two fifty.", llm: 0.48, speak: 3.5, tool: { name: "place_order", args: { size: "large", toppings: ["pepperoni", "extra cheese"], name: "Dana", pickup: "18:30" }, defer: true } },
      },
      {
        gap: 0.4,
        words: say("Perfect,|0.48|0.1|0.72 thanks.|0.4|0|0.95"),
        agent: { text: "See you at six thirty, Dana!", llm: 0.28, speak: 1.8 },
      },
    ],
  },
  {
    id: "clinic",
    title: "Clinic reschedule",
    blurb: "Pauses and tool calls.",
    prompt: "You reschedule appointments for Northside Family Clinic. Always check availability before offering a time. Never book without the patient confirming.",
    greeting: { text: "Northside Family Clinic, this is the scheduling assistant. How can I help?", speak: 3.9 },
    exchanges: [
      {
        gap: 0.8,
        words: say("I|0.1 need|0.22 to|0.1 move|0.26 my|0.16 appointment|0.56|0.5|0.66 from|0.2 Thursday.|0.56|0|0.9"),
        agent: { text: "I can help with that. What day works better for you?", llm: 0.32, speak: 2.9 },
      },
      {
        gap: 0.6,
        words: say("Next|0.26 Tuesday,|0.5|0.45|0.74 in|0.12 the|0.1 afternoon|0.5|0.4|0.8 if|0.14 you|0.12 have|0.18 it.|0.3|0|0.92", [0.98, 0.95, 0.97, 0.99, 0.96, 0.98, 0.98, 0.97, 0.98]),
        agent: { text: "Next Tuesday I have two forty-five or four fifteen. Which would you like?", llm: 0.62, speak: 4.1, tool: { name: "check_availability", args: { day: "next_tuesday", window: "afternoon" } } },
      },
      {
        gap: 0.5,
        words: say("Uh,|0.3|0.5|0.3 two|0.24 forty-five.|0.62|0|0.91", [0.7, 0.96, 0.93]),
        agent: { text: "You're booked for Tuesday at two forty-five. You'll get a text confirmation.", llm: 0.44, speak: 3.8, tool: { name: "book_appointment", args: { day: "next_tuesday", time: "14:45" }, defer: true } },
      },
    ],
  },
  {
    id: "support",
    title: "Support, with interruptions",
    blurb: "The caller interrupts.",
    prompt: "You are Wavelength Internet's support agent. Troubleshoot step by step. Stop talking when the customer interrupts.",
    greeting: { text: "Thanks for calling Wavelength support. I can help with connection, billing or equipment questions. What's going on today?", speak: 6.2 },
    exchanges: [
      {
        gap: -2.4,
        words: say("My|0.16 internet's|0.42 been|0.18 down|0.32 since|0.26 this|0.18 morning.|0.5|0|0.93"),
        agent: { text: "Sorry about that. Let's check your router first. Can you see the light on the front, and is it green, orange or blinking?", llm: 0.38, speak: 6.6 },
      },
      {
        gap: -3.1,
        words: say("It's|0.2 blinking|0.42 orange.|0.48|0|0.94"),
        agent: { text: "Blinking orange means it isn't getting a signal. Unplug it for ten seconds, then plug it back in. I'll wait.", llm: 0.36, speak: 5.9 },
      },
      {
        gap: 4.2,
        words: say("Okay,|0.36|0.7|0.6 it's|0.18 back.|0.4|0.6|0.7 It's|0.2 green|0.32 now.|0.4|0|0.94"),
        agent: { text: "Green means you're back online. Anything else I can help with?", llm: 0.3, speak: 3.2 },
      },
    ],
  },
];

export const SESSION_BY_ID = Object.fromEntries(SESSIONS.map((s) => [s.id, s])) as Record<string, Session>;
