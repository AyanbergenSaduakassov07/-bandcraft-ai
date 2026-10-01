import type { Metadata } from "next";
import { WriteFlow } from "@/components/write/write-flow";
import { createClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Write · BandCraft AI",
  description: "Write an IELTS Writing response and get a band estimate for each criterion, with the evidence behind it.",
};

export default async function WritePage() {
  const supabase = await createClient();
  // The streak needs only when you practised; 90 days covers the 12-week heatmap in any timezone.
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data } = await supabase.from("scripts").select("created_at").gte("created_at", since);
  return <WriteFlow practisedAt={(data ?? []).map((r) => r.created_at as string)} />;
}
