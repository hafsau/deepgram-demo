import type { Metadata } from "next";
import { CreateKey } from "@/components/console/create-key";

export const metadata: Metadata = { title: "API keys", description: "Create an API key from its use case, with permissions explained before it exists and a one-time secret you can't lose." };

export default function Page() {
  return <CreateKey />;
}
