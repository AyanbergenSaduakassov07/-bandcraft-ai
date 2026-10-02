import { readScoringRequest, SCORING_API } from "@/lib/scoring";

// Pre-submit template check (scoring API POST /originality). Advisory: any failure answers null,
// and the student goes straight on to scoring.
export const maxDuration = 30;

export async function POST(req: Request) {
  const gate = await readScoringRequest(req);
  if (gate instanceof Response) return gate;
  try {
    const res = await fetch(`${SCORING_API}/originality`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(gate.body),
      signal: AbortSignal.timeout(maxDuration * 1000),
    });
    return Response.json(res.ok ? await res.json() : null);
  } catch (e) {
    console.error("originality check unavailable", e);
    return Response.json(null);
  }
}
