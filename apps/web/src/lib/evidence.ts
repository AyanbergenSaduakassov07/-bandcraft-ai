// Evidence Spans → highlightable runs of a Script. Relative-import free so `node --test` can run it.
import type { Criterion, TaskType } from "@bandcraft/shared";

export type Evidence = { quote: string; observation: string; start: number | null; end: number | null; verified: boolean };

/** Pre-submit template check (apps/scoring-api schemas.OriginalityCheck). Warns; never changes a band. */
export type OriginalityCheck = {
  risk: number;
  template_heavy: boolean;
  paths: { similarity: number; embedding: number; classifier: number };
  evidence: Evidence[];
  embedding_model: string;
};

/** The POST /score/final body (apps/scoring-api schemas.FinalResponse), minus the stored embedding. */
export type FinalResponse = {
  task_type: TaskType;
  script: string;
  overall: { band: number };
  criteria: Record<
    Criterion,
    {
      band: number;
      paths: { gemini: number[]; calibrated: number; deterministic: number; ensemble: number };
      evidence: Evidence[];
    }
  >;
  second_pass: boolean;
  gemini_models: string[];
  calibration_version: string;
  originality?: OriginalityCheck | null;
  latency_ms: number;
};

export type Span = Evidence & { id: string; c: Criterion; start: number; end: number };
export type Segment = { text: string; span?: Span };

/**
 * Locate a quote in the Script. The API's offsets are Python code points; JS strings are UTF-16,
 * so trust the offsets only when they slice out the quote, else search for it.
 */
function locate(script: string, e: Evidence): [number, number] | null {
  if (!e.verified) return null;
  if (e.start !== null && e.end !== null && script.slice(e.start, e.end) === e.quote) return [e.start, e.end];
  const at = script.indexOf(e.quote);
  return at < 0 ? null : [at, at + e.quote.length];
}

/** Every verified span, with a stable id per criterion and position. Unverified quotes are left out. */
export function spans(script: string, criteria: Partial<Record<Criterion, { evidence: Evidence[] }>>): Span[] {
  return (Object.entries(criteria) as [Criterion, { evidence: Evidence[] }][])
    .flatMap(([c, s]) =>
      s.evidence.flatMap((e, i) => {
        const at = locate(script, e);
        return at ? [{ ...e, id: `${c}-${i}`, c, start: at[0], end: at[1] }] : [];
      }),
    )
    .sort((a, b) => a.start - b.start);
}

/** Split the Script into plain and highlighted runs. On overlap the earlier span wins; the later one stays listed, not drawn. */
export function segments(script: string, all: Span[]): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  for (const s of all) {
    if (s.start < pos) continue;
    if (s.start > pos) out.push({ text: script.slice(pos, s.start) });
    out.push({ text: script.slice(s.start, s.end), span: s });
    pos = s.end;
  }
  out.push({ text: script.slice(pos) });
  return out.filter((s) => s.text);
}

/** IELTS counts words separated by spaces; hyphenated words and numbers count once. */
export const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;
