import { TASK_TYPES } from "@bandcraft/shared";
import type { FinalResponse } from "@/lib/evidence";
import { createClient } from "@/lib/supabase";

// Server-side proxy to the scoring API's POST /score/final, so the API needs no CORS or public URL.
// A scoring call can take a Gemini Second Pass, so allow it time.
export const maxDuration = 120;

const API = process.env.SCORING_API_URL ?? "http://127.0.0.1:8000";

const fail = (status: number, detail: string) => Response.json({ detail }, { status });

export async function POST(req: Request) {
  // Gemini API terms: users must be 18+. Only accounts that passed the signup gate have a profile.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return fail(401, "Sign in to score a response.");
  const { data: profile } = await supabase.from("profiles").select("id").maybeSingle();
  if (!profile) return fail(403, "Scoring is only available to accounts aged 18 and over.");

  const body = await req.json().catch(() => null);
  const { task_type, prompt, script } = (body ?? {}) as Record<string, unknown>;
  // Same limits as apps/scoring-api schemas.DraftRequest, checked here so junk never costs a Gemini call.
  if (!TASK_TYPES.includes(task_type as never)) return fail(422, "Choose a task type.");
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 4_000) return fail(422, "Paste the task prompt (up to 4,000 characters).");
  if (typeof script !== "string" || !script.trim() || script.length > 20_000) return fail(422, "Write your response first (up to 20,000 characters).");

  try {
    const res = await fetch(`${API}/score/final`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task_type, prompt, script }),
      signal: AbortSignal.timeout(maxDuration * 1000),
    });
    const data = await res.json().catch(() => ({ detail: `Scoring API returned ${res.status}` }));
    if (res.status >= 500) {
      // Server-side causes (no API key, no calibration, Gemini down) are for us, not the student.
      console.error("scoring API error", res.status, data);
      return fail(res.status, "Scoring isn’t available right now. Your draft is saved, so try again in a little while.");
    }
    if (!res.ok) return Response.json(data, { status: res.status });
    return Response.json({ ...data, saved_id: await save(supabase, task_type as string, prompt, data as FinalResponse) });
  } catch (e) {
    console.error("scoring API unreachable", e);
    return fail(502, "The scoring service didn't respond. Try again in a minute.");
  }
}

/** Saves the Script and its bands to the user's history. A failed save never hides a correct score. */
async function save(supabase: Awaited<ReturnType<typeof createClient>>, taskType: string, prompt: string, result: FinalResponse) {
  // Store the normalised Script: the evidence offsets in the result index into it.
  const { data, error } = await supabase.rpc("save_scored_script", { p_task_type: taskType, p_prompt: prompt, p_text: result.script, p_result: result });
  if (error) console.error("saving scored script failed", error);
  return error ? null : (data as string);
}
