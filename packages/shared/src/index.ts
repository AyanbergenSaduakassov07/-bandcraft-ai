// Rubric constants and the scoring output contract. See /CONTEXT.md for term definitions.

export const TASK_TYPES = ["task1_academic", "task1_general", "task2"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const CRITERIA = [
  "task_achievement_response",
  "coherence_cohesion",
  "lexical_resource",
  "grammatical_range_accuracy",
] as const;
export type Criterion = (typeof CRITERIA)[number];

export const CRITERION_LABELS: Record<Criterion, string> = {
  task_achievement_response: "Task Achievement / Task Response",
  coherence_cohesion: "Coherence and Cohesion",
  lexical_resource: "Lexical Resource",
  grammatical_range_accuracy: "Grammatical Range and Accuracy",
};

/** Criterion bands are whole numbers 0–9; the overall band rounds to the nearest 0.5. */
export const BAND_MIN = 0;
export const BAND_MAX = 9;

/** Task 2 carries twice the weight of Task 1 when both are combined into one Writing band. */
export const TASK2_WEIGHT = 2;

/** A band plus its explicit margin of error: the true band lies in [band - margin, band + margin]. */
export interface BandEstimate {
  band: number;
  margin: number;
}

export interface ScoreResult {
  taskType: TaskType;
  overall: BandEstimate;
  criteria: Record<Criterion, BandEstimate>;
}
