import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AnnotatedScript, ScoreReveal } from "@/components/write/results";
import type { FinalResponse } from "@/lib/evidence";
import { createClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "Scored response · BandCraft AI" };

export default async function ScriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS limits this to the signed-in user's own Scripts; anyone else's id is simply not found.
  const { data } = await supabase.from("scripts").select("prompt, created_at, result").eq("id", id).maybeSingle();
  if (!data) notFound();
  const result = data.result as FinalResponse;

  return (
    <div className="space-y-8">
      <Link href="/history" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All responses
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">
          Scored {new Date(data.created_at).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "UTC" })} UTC
        </p>
        <p className="mt-2 max-w-prose">{data.prompt}</p>
      </div>
      <ScoreReveal result={result} reveal={false} />
      <AnnotatedScript result={result} />
      <p className="text-xs text-muted-foreground">
        Calibration {result.calibration_version} · {result.gemini_models.join(", ")}. An estimate, not an official IELTS result.
      </p>
    </div>
  );
}
