import { CRITERIA, CRITERION_LABELS, type ScoreResult } from "@bandcraft/shared";
import { BandGauge } from "@/components/score/band-gauge";
import { cn } from "@/lib/utils";

export const SAMPLE_RESULT: ScoreResult = {
  taskType: "task2",
  overall: { band: 6.5 },
  criteria: {
    task_achievement_response: { band: 7 },
    coherence_cohesion: { band: 6 },
    lexical_resource: { band: 6 },
    grammatical_range_accuracy: { band: 7 },
  },
};

/**
 * Renders the final state. The hero animates it from the data-* hooks;
 * without JS or with reduced motion, this is what people see.
 */
export function ScoreCard({ result, className }: { result: ScoreResult; className?: string }) {
  const { overall, criteria } = result;
  return (
    <div className={cn("w-full rounded-3xl p-6 sm:p-8", className)}>
      <p className="text-sm font-medium text-muted-foreground">Task 2 · Overall band</p>
      <div className="mt-3 flex items-center gap-4">
        <BandGauge band={overall.band} label={false} className="size-16 shrink-0" />
      <p data-band className="font-display text-6xl font-bold text-primary tabular-nums">
        {overall.band.toFixed(1)}
      </p>
      </div>
      <ul className="mt-6 space-y-3">
        {CRITERIA.map((c) => (
          <li key={c}>
            <div className="flex justify-between gap-3 text-sm">
              <span>{CRITERION_LABELS[c]}</span>
              <span className="font-semibold tabular-nums">
                {criteria[c].band}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                data-bar={criteria[c].band / 9}
                className="h-full origin-left rounded-full bg-brand-500"
                style={{ transform: `scaleX(${criteria[c].band / 9})` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
