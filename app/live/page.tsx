import type { Metadata } from "next";
import { LiveMic } from "@/components/live/live-mic";

export const metadata: Metadata = { title: "Live mic", description: "Feel turn detection with your own voice: a silence timer in the browser, and optional live Flux end-of-turn confidence with your own key." };

export default function Page() {
  return <LiveMic />;
}
