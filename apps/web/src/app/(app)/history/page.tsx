import type { Metadata } from "next";
import Link from "next/link";
import type { Criterion, TaskType } from "@bandcraft/shared";
import { BandTrend, type TrendPoint } from "@/components/history/band-trend";
import { createClient } from "@/lib/supabase";

export const metadata: Metadata = { title: "History · BandCraft AI" };

const TASK_LABEL: Record<TaskType, string> = { task1_academic: "Task 1 Academic", task1_general: "Task 1 General", task2: "Task 2" };
// ponytail: list dates render on the server in UTC, so a 1am Astana essay shows the previous day; move to a client date component if that confuses people.

type Row = {
  id: string;
  task_type: TaskType;
  prompt: string;
  overall_band: number;
  created_at: string;
  criterion_bands: { criterion: Criterion; band: number }[];
};

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scripts")
    .select("id, task_type, prompt, overall_band, created_at, criterion_bands(criterion, band)")
    .order("created_at", { ascending: true })
    .returns<Row[]>();
  if (error) throw new Error(`Couldn't load your history: ${error.message}`);

  if (!data.length)
    return (
      <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-border">
        <h1 className="text-2xl font-bold tracking-[-0.022em]">No scored responses yet</h1>
        <p className="mt-2 text-muted-foreground">Each response you score shows up here, with its bands and the evidence behind them.</p>
        <Link href="/write" className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
          Write your first response
        </Link>
      </div>
    );

  // numeric columns arrive as strings from PostgREST; Number() them once here.
  const points: TrendPoint[] = data.map((r) => ({
    id: r.id,
    at: r.created_at,
    task: r.task_type,
    overall: Number(r.overall_band),
    criteria: Object.fromEntries(r.criterion_bands.map((c) => [c.criterion, c.band])),
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-[-0.022em]">Your history</h1>
      <BandTrend points={points} />
      <section>
        <h2 className="text-xl font-semibold">Every scored response</h2>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-3xl bg-card ring-1 ring-border">
          {[...data].reverse().map((r) => (
            <li key={r.id}>
              <Link href={`/history/${r.id}`} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/60">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">
                    {TASK_LABEL[r.task_type]} · {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                  </p>
                  <p className="mt-0.5 truncate">{r.prompt}</p>
                </div>
                <p className="shrink-0 text-lg font-bold tabular-nums">
                  {Number(r.overall_band).toFixed(1)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
