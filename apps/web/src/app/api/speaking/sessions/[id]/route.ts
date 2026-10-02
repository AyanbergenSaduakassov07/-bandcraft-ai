import { requireAdult } from "@/lib/scoring";
import { sessionId, SPEAKING_API, speakingHeaders } from "@/lib/speaking";

/** The scored Parts of one of the signed-in user's Speaking sessions. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const adult = await requireAdult();
  if (adult instanceof Response) return adult;
  const id = encodeURIComponent(sessionId(adult.userId, (await params).id));
  try {
    const res = await fetch(`${SPEAKING_API}/sessions/${id}`, { headers: speakingHeaders(), cache: "no-store" });
    return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
  } catch {
    return Response.json({ detail: "The speaking examiner isn't available right now." }, { status: 502 });
  }
}
