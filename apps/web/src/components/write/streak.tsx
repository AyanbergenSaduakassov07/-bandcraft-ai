"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { currentStreak, dayKey, heatmap } from "@/lib/streak";
import { cn } from "@/lib/utils";

const HEAT = ["bg-muted", "bg-brand-300/40", "bg-brand-300", "bg-brand-500", "bg-primary"];

/**
 * Practice cadence from the times Scripts were scored. Only timestamps come in, never bands.
 * Days are bucketed in the viewer's own timezone, so it renders after mount rather than on the server.
 */
export function Streak({ practisedAt, className }: { practisedAt: string[]; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const days = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of practisedAt) {
      const k = dayKey(new Date(t));
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [practisedAt]);
  if (!mounted) return null;

  const streak = currentStreak(new Set(days.keys()));
  const cells = heatmap(days);
  const practised = cells.filter((n) => n).length;
  return (
    <section aria-label="Practice streak" className={cn("rounded-3xl bg-card p-6 ring-1 ring-border", className)}>
      <p className="flex items-center gap-2 text-lg font-semibold">
        <Flame className={cn("size-5", streak ? "text-brand-500" : "text-muted-foreground")} />
        {streak ? `${streak}-day streak` : "No streak yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {streak && !days.has(dayKey(new Date())) ? "Write today to keep it going." : "Score one response a day to build a streak."}
      </p>
      <div className="mt-5 grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label={`Practised on ${practised} of the last 84 days`}>
        {cells.map((n, i) => (
          <div key={i} className={cn("aspect-square rounded-[3px]", n === null ? "invisible" : HEAT[Math.min(n, 4)])} />
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Counts the days you practise. It never changes or rewards a band.
      </p>
    </section>
  );
}
