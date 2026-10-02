// Server-side proxy helpers for apps/speaking-api (ADR-0005). The browser never sees its key.
export const SPEAKING_API = process.env.SPEAKING_API_URL ?? "http://127.0.0.1:8001";

export const speakingHeaders = () => ({
  "content-type": "application/json",
  "x-speaking-key": process.env.SPEAKING_API_KEY ?? "",
});

/** Session ids carry the user id, so one account can never read another's results. */
export const sessionId = (userId: string, clientId: string) => `${userId}:${clientId.replace(/[^\w-]/g, "").slice(0, 64)}`;
