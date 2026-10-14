import type { Metadata } from "next";
import { Usage } from "@/components/console/usage";

export const metadata: Metadata = { title: "Usage", description: "Console usage that answers real questions: p50/p95 latency per model, spend projected against credit, a budget alert proposal and a request inspector." };

export default function Page() {
  return <Usage />;
}
