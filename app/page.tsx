import { Playground } from "@/components/playground/playground";
import { fromQuery } from "@/lib/share";

// Rendered on the server from the query string, so a shared link arrives fully drawn (no layout shift).
export default async function Page({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  return <Playground initial={fromQuery(q)} />;
}
