import type { Config } from "@/lib/engine";
import { SESSION_BY_ID } from "@/lib/sessions";

/*
 * "Get code" generates the Voice Agent Settings message from exactly what's
 * set in the UI, plus minimal clients. The API key is never inlined: code reads
 * DEEPGRAM_API_KEY from the environment.
 */

export const AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse";

const THINK: Record<Config["llm"], { type: string; model: string }> = {
  "gpt-4o-mini": { type: "open_ai", model: "gpt-4o-mini" },
  "gpt-4.1": { type: "open_ai", model: "gpt-4.1" },
  "claude-haiku": { type: "anthropic", model: "claude-3-5-haiku-latest" },
};

export function settingsMessage(cfg: Config) {
  const s = SESSION_BY_ID[cfg.session];
  const listen =
    cfg.listen === "flux"
      ? {
          type: "deepgram",
          version: "v2",
          model: "flux-general-en",
          eot_threshold: cfg.eot,
          ...(cfg.eager !== null ? { eager_eot_threshold: cfg.eager } : {}),
          eot_timeout_ms: cfg.timeoutMs,
        }
      : { type: "deepgram", version: "v1", model: "nova-3", language: "en" };
  const flux = cfg.voice.startsWith("flux");
  const functions = s.exchanges
    .map((e) => e.agent.tool)
    .filter((t): t is NonNullable<typeof t> => !!t)
    .filter((t, i, all) => all.findIndex((x) => x.name === t.name) === i)
    .map((t) => ({
      name: t.name,
      description: `Demo function: ${t.name.replace(/_/g, " ")}`,
      parameters: { type: "object", properties: Object.fromEntries(Object.keys(t.args).map((k) => [k, { type: Array.isArray(t.args[k]) ? "array" : "string" }])) },
      ...(t.defer ? { defer_until_eot: true } : {}),
    }));
  return {
    type: "Settings",
    audio: { input: { encoding: "linear16", sample_rate: 16000 }, output: { encoding: "linear16", sample_rate: 24000, container: "none" } },
    agent: {
      greeting: s.greeting.text,
      listen: { provider: listen },
      think: { provider: THINK[cfg.llm], prompt: s.prompt, ...(functions.length ? { functions } : {}) },
      speak: { provider: { type: "deepgram", version: flux ? "v2" : "v1", model: cfg.voice, ...(cfg.speed !== 1 ? { speed: cfg.speed } : {}) } },
    },
  };
}

export type Lang = "json" | "javascript" | "python";

export function code(cfg: Config, lang: Lang): string {
  const settings = JSON.stringify(settingsMessage(cfg), null, 2);
  if (lang === "json") return settings;
  if (lang === "javascript") {
    return `// npm install ws
import WebSocket from "ws";

const ws = new WebSocket("${AGENT_URL}", {
  headers: { Authorization: \`Token \${process.env.DEEPGRAM_API_KEY}\` },
});

const settings = ${settings.replace(/\n/g, "\n")};

ws.on("open", () => ws.send(JSON.stringify(settings)));

ws.on("message", (data, isBinary) => {
  if (isBinary) return playAudio(data); // agent speech, linear16 @ 24 kHz
  const msg = JSON.parse(data.toString());
  if (msg.type === "LatencyReport") console.log("turn latency (s)", msg.total_latency);
  else console.log(msg.type, msg);
});

// Send microphone audio (linear16 @ 16 kHz) with ws.send(chunk).
function playAudio(chunk) {
  /* pipe to your audio output */
}
`;
  }
  return `# pip install websockets
import asyncio, json, os
import websockets

SETTINGS = json.loads("""
${settings}
""")

async def main():
    headers = {"Authorization": f"Token {os.environ['DEEPGRAM_API_KEY']}"}
    async with websockets.connect("${AGENT_URL}", additional_headers=headers) as ws:
        await ws.send(json.dumps(SETTINGS))
        async for message in ws:
            if isinstance(message, bytes):
                continue  # agent speech, linear16 @ 24 kHz
            msg = json.loads(message)
            if msg["type"] == "LatencyReport":
                print("turn latency (s)", msg.get("total_latency"))
            else:
                print(msg["type"])

asyncio.run(main())
`;
}
