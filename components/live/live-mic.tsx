"use client";

import { useEffect, useId, useRef, useState } from "react";
import { btn } from "@/components/styles";
import { Panel, Slider } from "@/components/voice/controls";

/*
 * Live mic. Two layers:
 *  1. Free, no key: a real silence-based turn detector running on your mic,
 *     the way Nova-style endpointing works. Pause to think and watch it decide
 *     you're done.
 *  2. Bring your own key: stream to Flux (/v2/listen) and plot its end-of-turn
 *     confidence live against eot_threshold. The key is kept in memory for this
 *     tab only, sent only to api.deepgram.com, and never stored.
 */

type Phase = "idle" | "starting" | "listening" | "error";
type FluxState = "off" | "connecting" | "open" | "error";
type Point = { t: number; v: number };

const FLUX_URL = "wss://api.deepgram.com/v2/listen";
const WINDOW_S = 12;
/** Wall clock in ms. Only ever called from event handlers and animation frames. */
function clockMs() {
  return performance.now();
}

export function LiveMic() {
  const id = useId();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [endpointing, setEndpointing] = useState(700);
  const [threshold, setThreshold] = useState(0.7);
  const [speaking, setSpeaking] = useState(false);
  const [silenceMs, setSilenceMs] = useState(0);
  const [turns, setTurns] = useState<number[]>([]);
  const [key, setKey] = useState("");
  const [flux, setFlux] = useState<FluxState>("off");
  const [fluxError, setFluxError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [lastEvent, setLastEvent] = useState<Record<string, unknown> | null>(null);

  const wave = useRef<HTMLCanvasElement>(null);
  const chart = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const procRef = useRef<ScriptProcessorNode | null>(null);
  const raf = useRef(0);
  const energy = useRef<Point[]>([]);
  const conf = useRef<Point[]>([]);
  const t0 = useRef(0);
  const settings = useRef({ endpointing, threshold });
  // eslint-disable-next-line react-hooks/refs -- the render loop reads the latest settings without restarting
  settings.current = { endpointing, threshold };

  const stop = () => {
    cancelAnimationFrame(raf.current);
    procRef.current?.disconnect();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    wsRef.current = null;
    setPhase("idle");
    setFlux("off");
    setSpeaking(false);
  };

  useEffect(() => () => stop(), []);

  const start = async (withKey: boolean) => {
    setError("");
    setFluxError("");
    setTurns([]);
    setTranscript("");
    energy.current = [];
    conf.current = [];
    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("error");
      setError("This browser can't share a microphone with web pages.");
      return;
    }
    setPhase("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      setPhase("error");
      setError((e as Error).name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser's site settings, then try again." : "No microphone was found, or it's in use by another app.");
      return;
    }
    streamRef.current = stream;
    const ctx = new AudioContext({ sampleRate: 16000 });
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    t0.current = clockMs();
    setPhase("listening");

    if (withKey) connectFlux(ctx, src);

    const buf = new Float32Array(analyser.fftSize);
    let lastVoice = clockMs();
    let inTurn = false;
    const loop = () => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const x of buf) sum += x * x;
      const rms = Math.sqrt(sum / buf.length);
      const now = clockMs();
      const t = (now - t0.current) / 1000;
      const voice = rms > 0.02;
      if (voice) {
        lastVoice = now;
        inTurn = true;
      }
      const silent = now - lastVoice;
      if (inTurn && silent >= settings.current.endpointing) {
        inTurn = false;
        setTurns((ts) => [...ts, t]);
      }
      setSpeaking(voice);
      setSilenceMs(inTurn ? Math.round(silent) : 0);
      energy.current.push({ t, v: Math.min(1, rms * 8) });
      energy.current = energy.current.filter((p) => p.t > t - WINDOW_S);
      conf.current = conf.current.filter((p) => p.t > t - WINDOW_S);
      draw(t);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const connectFlux = (ctx: AudioContext, src: MediaStreamAudioSourceNode) => {
    setFlux("connecting");
    const url = `${FLUX_URL}?model=flux-general-en&encoding=linear16&sample_rate=16000&eot_threshold=${settings.current.threshold}`;
    let ws: WebSocket;
    try {
      // Browser auth: the key travels as a WebSocket subprotocol, only to api.deepgram.com.
      ws = new WebSocket(url, ["token", key.trim()]);
    } catch {
      setFlux("error");
      setFluxError("Couldn't open a connection to Deepgram.");
      return;
    }
    wsRef.current = ws;
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      setFlux("open");
      const proc = ctx.createScriptProcessor(2048, 1, 1);
      procRef.current = proc;
      proc.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const f = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(f.length);
        for (let i = 0; i < f.length; i++) pcm[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
        ws.send(pcm.buffer);
      };
      src.connect(proc);
      proc.connect(ctx.destination);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data));
        setLastEvent(msg);
        if (msg.type === "TurnInfo") {
          const c = msg.end_of_turn_confidence ?? msg.eot_confidence;
          if (typeof c === "number") conf.current.push({ t: (clockMs() - t0.current) / 1000, v: c });
          if (typeof msg.transcript === "string" && msg.transcript) setTranscript(msg.transcript);
        }
      } catch {
        /* non-JSON frame */
      }
    };
    ws.onerror = () => {
      setFlux("error");
      setFluxError("Deepgram closed the connection. Check that the key is valid and has credit, and that it has Member role or higher.");
    };
    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 1005) {
        setFlux("error");
        setFluxError(`Connection closed (code ${e.code}${e.reason ? `: ${e.reason}` : ""}). An invalid key or no remaining credit are the usual causes.`);
      } else setFlux((s) => (s === "error" ? s : "off"));
    };
  };

  const draw = (t: number) => {
    const c = wave.current;
    if (c) {
      const g = c.getContext("2d")!;
      const { width: w, height: h } = c;
      g.clearRect(0, 0, w, h);
      g.fillStyle = "#13ef93";
      for (const p of energy.current) {
        const x = ((p.t - (t - WINDOW_S)) / WINDOW_S) * w;
        const bh = Math.max(1, p.v * h * 0.9);
        g.fillRect(x, (h - bh) / 2, 2, bh);
      }
    }
    const k = chart.current;
    if (k) {
      const g = k.getContext("2d")!;
      const { width: w, height: h } = k;
      g.clearRect(0, 0, w, h);
      const y = (v: number) => h - v * h;
      g.strokeStyle = "#13ef93";
      g.setLineDash([]);
      g.beginPath();
      g.moveTo(0, y(settings.current.threshold));
      g.lineTo(w, y(settings.current.threshold));
      g.stroke();
      g.strokeStyle = "#c7a2ff";
      g.lineWidth = 2;
      g.beginPath();
      conf.current.forEach((p, i) => {
        const x = ((p.t - (t - WINDOW_S)) / WINDOW_S) * w;
        if (i === 0) g.moveTo(x, y(p.v));
        else g.lineTo(x, y(p.v));
      });
      g.stroke();
      g.lineWidth = 1;
    }
  };

  const listening = phase === "listening";

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <p className="eyebrow">Playground · Live mic</p>
      <h1 className="display mt-1 text-3xl sm:text-4xl">Feel turn detection with your own voice</h1>
      <p className="mt-2 max-w-3xl text-muted">Talk, then pause mid-sentence as if you&apos;re thinking. A silence timer decides you&apos;re done; Flux listens for whether you sound done.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Silence timer, on your mic" id={`${id}-local`} actions={<span className="text-xs text-muted">Runs in your browser. No key, no cost.</span>}>
          <div className="flex flex-wrap items-center gap-3">
            {listening ? (
              <button type="button" onClick={stop} className={btn("secondary")}>
                Stop
              </button>
            ) : (
              <button type="button" onClick={() => start(false)} disabled={phase === "starting"} className={btn("primary")}>
                {phase === "starting" ? "Starting…" : "Start microphone"}
              </button>
            )}
            <p role="status" aria-live="polite" className="text-sm">
              {listening ? (speaking ? <span className="text-green">Hearing you</span> : silenceMs > 0 ? <span className="text-amber tnum">Silence {silenceMs} ms of {endpointing}</span> : <span className="text-muted">Waiting for speech</span>) : phase === "idle" ? <span className="text-muted">Microphone off</span> : null}
            </p>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red bg-red/10 p-3 text-sm text-text">
              {error}
            </p>
          )}
          <canvas ref={wave} width={900} height={90} className="mt-4 h-[90px] w-full rounded-lg bg-bg" aria-label="Live microphone level over the last 12 seconds" role="img" />
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg" aria-hidden="true">
            <div className="h-full bg-amber transition-[width]" style={{ width: `${Math.min(100, (silenceMs / endpointing) * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm">
            Turns ended: <span className="font-mono text-text tnum">{turns.length}</span>
            {turns.length > 0 && <span className="text-muted"> (last at {turns[turns.length - 1].toFixed(1)} s)</span>}
          </p>
        </Panel>

        <Panel title="Settings" id={`${id}-set`}>
          <div className="space-y-4">
            <Slider label="Endpointing (silence)" value={endpointing} min={200} max={2000} step={50} format={(v) => `${v} ms`} onChange={setEndpointing} hint="Pause longer than this and the timer ends your turn." />
            <Slider label="eot_threshold (Flux)" value={threshold} min={0.5} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={setThreshold} hint="Applied when you connect with a key." />
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Flux, live (bring your own key)" id={`${id}-flux`} actions={<span className="text-xs text-muted">Optional</span>}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div>
              <label htmlFor={`${id}-key`} className="block text-sm text-text">
                Your Deepgram API key
              </label>
              <input
                id={`${id}-key`}
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                aria-describedby={`${id}-key-hint`}
                className="mt-1.5 h-11 w-full rounded-[4px] border border-line-strong bg-card px-2.5 font-mono text-sm text-text"
              />
              <p id={`${id}-key-hint`} className="mt-1.5 text-xs leading-snug text-muted">
                Kept in this tab&apos;s memory only and sent only to api.deepgram.com. Never stored. New accounts get $200 of free credit; a minute of Flux costs under a cent.
              </p>
              <button type="button" disabled={!key.trim() || listening} onClick={() => start(true)} className={btn("primary", "mt-3")}>
                Connect and start talking
              </button>
              <p role="status" className="mt-2 text-sm">
                {flux === "connecting" && <span className="text-muted">Connecting…</span>}
                {flux === "open" && <span className="text-green">Streaming to Flux</span>}
              </p>
              {fluxError && (
                <p role="alert" className="mt-2 rounded-lg border border-red bg-red/10 p-3 text-sm text-text">
                  {fluxError}
                </p>
              )}
            </div>
            <div>
              <canvas ref={chart} width={900} height={140} className="h-[140px] w-full rounded-lg bg-bg" role="img" aria-label="Flux end-of-turn confidence over the last 12 seconds, with the threshold as a green line" />
              <p className="mt-2 min-h-6 text-text" aria-live="polite">
                {transcript || <span className="text-muted">Your words appear here.</span>}
              </p>
              {lastEvent && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-link">Last message from Flux</summary>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-bg p-3 font-mono text-xs text-body">{JSON.stringify(lastEvent, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
