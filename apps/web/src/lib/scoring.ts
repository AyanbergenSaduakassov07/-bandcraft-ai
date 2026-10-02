import { TASK_TYPES, type TaskType } from "@bandcraft/shared";
import { createClient } from "@/lib/supabase";

// Shared by the server-side proxies to the scoring API, so the API needs no CORS or public URL.
export const SCORING_API = process.env.SCORING_API_URL ?? "http://127.0.0.1:8000";

export const fail = (status: number, detail: string) => Response.json({ detail }, { status });

export type ScoringRequest = { task_type: TaskType; prompt: string; script: string };

/** Signed-in adult with a valid body, or the error Response to return. Junk never costs a Gemini call. */
export async function readScoringRequest(req: Request) {
  // Gemini API terms: users must be 18+. Only accounts that passed the signup gate have a profile.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return fail(401, "Sign in to score a response.");
  const { data: profile } = await supabase.from("profiles").select("id").maybeSingle();
  if (!profile) return fail(403, "Scoring is only available to accounts aged 18 and over.");

  const body = await req.json().catch(() => null);
  const { task_type, prompt, script } = (body ?? {}) as Record<string, unknown>;
  // Same limits as apps/scoring-api schemas.DraftRequest.
  if (!TASK_TYPES.includes(task_type as never)) return fail(422, "Choose a task type.");
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4_000) return fail(422, "Paste the task prompt (up to 4,000 characters).");
  if (typeof script !== "string" || !script.trim() || script.length > 20_000) return fail(422, "Write your response first (up to 20,000 characters).");
  return { supabase, body: { task_type, prompt, script } as ScoringRequest };
}
