import type { Criterion } from "@bandcraft/shared";

// The four functional hues that tell criteria apart in a Script. Evidence only, never decoration.
export const TINT: Record<Criterion, string> = {
  task_achievement_response: "bg-sky-100 decoration-sky-500",
  coherence_cohesion: "bg-amber-100 decoration-amber-500",
  lexical_resource: "bg-emerald-100 decoration-emerald-500",
  grammatical_range_accuracy: "bg-violet-100 decoration-violet-500",
};
export const DOT: Record<Criterion, string> = {
  task_achievement_response: "bg-sky-500",
  coherence_cohesion: "bg-amber-500",
  lexical_resource: "bg-emerald-500",
  grammatical_range_accuracy: "bg-violet-500",
};
