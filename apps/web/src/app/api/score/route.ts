import type { FinalResponse } from "@/lib/evidence";
import type { createClient } from "@/lib/supabase";
import { fail, readScoringRequest, SCORING_API } from "@/lib/scoring";

// Server-side proxy to the scoring API's POST /score/final.
// A scoring call can take a Gemini Second Pass, so allow it time.
export const maxDuration = 120;

export async function POST(req: Request) {
  const gate = await readScoringRequest(req);
  if (gate instanceof Response) return gate;
  const { supabase, body } = gate;

  try {
    const res = await fetch(`${SCORING_API}/score/final`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(maxDuration * 1000),
    });
    const data = await res.json().catch(() => ({ detail: `Scoring API returned ${res.status}` }));
    if (res.status >= 500) {
      // Server-side causes (no API key, no calibration, Gemini down) are for us, not the student.
      console.error("scoring API error", res.status, data);
      return fail(res.status, "Scoring isn’t available right now. Your draft is saved, so try again in a little while.");
    }
    if (!res.ok) return Response.json(data, { status: res.status });
    // The embedding is stored in its own column; it never goes to the browser or into `result`.
    const { embedding, ...result } = data as FinalResponse & { embedding?: number[] | null };
    return Response.json({ ...result, saved_id: await save(supabase, body.task_type, body.prompt, result, embedding) });
  } catch (e) {
    console.error("scoring API unreachable", e);
    return fail(502, "The scoring service didn't respond. Try again in a minute.");
  }
}

/** Saves the Script and its bands to the user's history. A failed save never hides a correct score. */
async function save(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskType: string,
  prompt: string,
  result: FinalResponse,
  embedding: number[] | null | undefined,
) {
  // Store the normalised Script: the evidence offsets in the result index into it.
  const { data, error } = await supabase.rpc("save_scored_script", {
    p_task_type: taskType,
    p_prompt: prompt,
    p_text: result.script,
    p_result: result,
    p_embedding: embedding ? JSON.stringify(embedding) : null,
  });
  if (error) console.error("saving scored script failed", error);
  return error ? null : (data as string);
}
