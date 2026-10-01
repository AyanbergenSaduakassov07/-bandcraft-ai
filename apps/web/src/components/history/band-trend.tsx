"use client";

import { useEffect, useMemo, useState } from "react";
import { CRITERIA, CRITERION_LABELS, type Criterion, type TaskType } from "@bandcraft/shared";
import { cn } from "@/lib/utils";

export type TrendPoint = {
  id: string;
  at: string;
  task: TaskType;
  overall: number;
  criteria: Partial<Record<Criterion, number>>;
};

type Metric = "overall" | Criterion;
type TaskFilter = "all" | "task1" | "task2";
const SHORT: Record<Criterion, string> = {
  task_achievement_response: "Task Achievement / Response",
  coherence_cohesion: "Coherence",
  lexical_resource: "Lexical",
  grammatical_range_accuracy: "Grammar",
};
const TASK_LABEL: Record<TaskType, string> = { task1_academic: "Task 1 Academic", task1_general: "Task 1 General", task2: "Task 2" };
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const day = (iso: string, year = false) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(year && { year: "numeric" }) });

// Plot geometry (viewBox units). Height includes the x-axis band so the card never scrolls.
const W = 720, H = 260, L = 36, R = 16, T = 16, B = 32;

function Pills<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("min-h-9 rounded-xl px-3 text-sm font-medium transition-colors", value === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** Band over time, oldest to newest. */
export function BandTrend({ points }: { points: TrendPoint[] }) {
  const [metric, setMetric] = useState<Metric>("overall");
  const [task, setTask] = useState<TaskFilter>("all");
  const [hover, setHover] = useState<number | null>(null);
  // Dates are shown in the viewer's timezone, which the server doesn't know: render them after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const series = useMemo(
    () =>
      points
        .filter((p) => task === "all" || (task === "task2" ? p.task === "task2" : p.task !== "task2"))
        .flatMap((p) => {
          const band = metric === "overall" ? p.overall : p.criteria[metric];
          return band === undefined ? [] : [{ ...p, band }];
        }),
    [points, metric, task],
  );

  const lo = Math.max(0, Math.floor(Math.min(...series.map((s) => s.band), 9)));
  const hi = Math.min(9, Math.ceil(Math.max(...series.map((s) => s.band), 0)));
  const [y0, y1] = hi - lo < 2 ? [Math.max(0, lo - 1), Math.min(9, hi + 1)] : [lo, hi];
  const x = (i: number) => (series.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (series.length - 1));
  const y = (b: number) => T + ((y1 - Math.min(y1, Math.max(y0, b))) * (H - T - B)) / (y1 - y0 || 1);
  const line = series.map((s, i) => `${x(i)},${y(s.band)}`).join(" ");
  const h = hover !== null ? series[hover] : null;
  const name = metric === "overall" ? "Overall band" : CRITERION_LABELS[metric];

  return (
    <section className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
      <h2 className="text-xl font-semibold">{name} over time</h2>
      <p className="mt-1 text-sm text-muted-foreground">One point per scored response, oldest to newest.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Pills label="Measure" value={metric} onChange={setMetric} options={[["overall", "Overall"], ...CRITERIA.map((c) => [c, SHORT[c]] as [Metric, string])]} />
        <Pills label="Task" value={task} onChange={setTask} options={[["all", "All tasks"], ["task1", "Task 1"], ["task2", "Task 2"]]} />
      </div>

      {series.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No scored responses for this task yet.</p>
      ) : (
        <div className="relative mt-6">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full touch-none"
            role="img"
            aria-label={`${name} for ${series.length} responses, from ${fmt(series[0].band)} to ${fmt(series.at(-1)!.band)}. The list below has every value.`}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - r.left) / r.width) * W;
              let best = 0;
              series.forEach((_, i) => Math.abs(x(i) - px) < Math.abs(x(best) - px) && (best = i));
              setHover(best);
            }}
            onPointerLeave={() => setHover(null)}
          >
            {Array.from({ length: y1 - y0 + 1 }, (_, k) => y0 + k).map((b) => (
              <g key={b}>
                <line x1={L} x2={W - R} y1={y(b)} y2={y(b)} stroke="var(--border)" strokeWidth="1" />
                <text x={L - 10} y={y(b)} dy="0.35em" textAnchor="end" className="fill-muted-foreground text-[12px] tabular-nums">
                  {b}
                </text>
              </g>
            ))}
            <polyline points={line} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {h && <line x1={x(hover!)} x2={x(hover!)} y1={T} y2={H - B} stroke="var(--muted-foreground)" strokeWidth="1" strokeDasharray="3 3" />}
            {series.map((s, i) => (
              <circle key={s.id} cx={x(i)} cy={y(s.band)} r={hover === i ? 6 : 4} fill="var(--primary)" stroke="var(--card)" strokeWidth="2" />
            ))}
            {mounted && (
              <text x={L} y={H - 8} className="fill-muted-foreground text-[12px]">
                {day(series[0].at)}
              </text>
            )}
            {mounted && series.length > 1 && (
              <text x={W - R} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[12px]">
                {day(series.at(-1)!.at)}
              </text>
            )}
          </svg>
          {h && (
            <div
              className="pointer-events-none absolute top-0 z-10 w-max -translate-x-1/2 rounded-xl bg-card px-3 py-2 text-sm shadow-float ring-1 ring-border"
              style={{ left: `${(x(hover!) / W) * 100}%` }}
            >
              <p className="font-semibold tabular-nums">
                {metric === "overall" ? h.band.toFixed(1) : h.band}
              </p>
              <p className="text-muted-foreground">
                {TASK_LABEL[h.task]} · {day(h.at, true)}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
