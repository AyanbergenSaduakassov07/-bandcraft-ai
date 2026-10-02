import { requireAdult } from "@/lib/scoring";
import { sessionId, SPEAKING_API, speakingHeaders } from "@/lib/speaking";

// WebRTC signalling for the Speaking examiner: the SDP offer (POST) and ICE candidates (PATCH)
// pass through here so only signed-in adults reach speaking-api. Audio then flows peer to peer.

async function forward(req: Request, method: "POST" | "PATCH") {
  const adult = await requireAdult();
  if (adult instanceof Response) return adult;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ detail: "Bad signalling request." }, { status: 422 });
  if (method === "POST") {
    const data = (body.requestData ?? body.request_data ?? {}) as { session_id?: unknown };
    body.request_data = { session_id: sessionId(adult.userId, String(data.session_id ?? "")) };
    delete body.requestData;
  }
  try {
    const res = await fetch(`${SPEAKING_API}/api/offer`, { method, headers: speakingHeaders(), body: JSON.stringify(body) });
    return new Response(res.body, { status: res.status, headers: { "content-type": "application/json" } });
  } catch (e) {
    console.error("speaking API unreachable", e);
    return Response.json({ detail: "The speaking examiner isn't available right now." }, { status: 502 });
  }
}

export const POST = (req: Request) => forward(req, "POST");
export const PATCH = (req: Request) => forward(req, "PATCH");
