"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, PhoneOff } from "lucide-react";
import { PipecatClient } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Evidence = { quote: string; observation: string; verified: boolean; source: "gemini" | "openpronounce" };
type Criterion = "fluency_coherence" | "lexical_resource" | "grammatical_range_accuracy" | "pronunciation";
type PartResult = {
  part: "part1" | "part2" | "part3";
  overall: number;
  criteria: Record<Criterion, { band: number; evidence: Evidence[] }>;
  pronunciation_paths: { gemini: number; openpronounce: number | null; calibrated: boolean };
};
type Session = { part: string; results: Partial<Record<PartResult["part"], PartResult>>; errors: Record<string, string>; scoring: number };

const LABELS: Record<Criterion, string> = {
  fluency_coherence: "Fluency and Coherence",
  lexical_resource: "Lexical Resource",
  grammatical_range_accuracy: "Grammatical Range and Accuracy",
  pronunciation: "Pronunciation",
};
const PARTS = { part1: "Part 1", part2: "Part 2", part3: "Part 3" } as const;
const POLL_MS = 5_000;

/** One Part's bands, with the quotes behind them and both Pronunciation estimates. */
function PartCard({ r }: { r: PartResult }) {
  const p = r.pronunciation_paths;
  return (
    <section className="rounded-3xl bg-card p-6 ring-1 ring-border">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">{PARTS[r.part]}</h2>
        <p className="font-display text-4xl font-bold text-primary tabular-nums">{r.overall.toFixed(1)}</p>
      </div>
      <dl className="mt-4 space-y-4">
        {(Object.keys(LABELS) as Criterion[]).map((c) => (
          <div key={c}>
            <div className="flex justify-between text-sm font-semibold">
              <dt>{LABELS[c]}</dt>
              <dd className="tabular-nums">{r.criteria[c].band}</dd>
            </div>
            <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
              {r.criteria[c].evidence.filter((e) => e.verified).slice(0, 4).map((e, i) => (
                <li key={i}>
                  “{e.quote}” {e.observation}
                  {e.source === "openpronounce" && <span className="ml-1 text-xs">(sound check, no AI judge)</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground tabular-nums">
        Pronunciation from two estimates: listening judge {p.gemini.toFixed(1)}, sound-level check{" "}
        {p.openpronounce === null ? "unavailable" : p.openpronounce.toFixed(1)}
        {p.calibrated ? "" : " (not calibrated yet)"}.
      </p>
    </section>
  );
}

export function SpeakFlow() {
  const [phase, setPhase] = useState<"idle" | "connecting" | "live" | "ended">("idle");
  const [speaker, setSpeaker] = useState<"examiner" | "you" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [id, setId] = useState<string | null>(null);
  const client = useRef<PipecatClient | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  // Parts are scored in the background as each ends; poll until nothing is left scoring.
  useEffect(() => {
    if (!id || phase === "idle") return;
    const tick = async () => {
      const res = await fetch(`/api/speaking/sessions/${id}`).catch(() => null);
      if (res?.ok) setSession((await res.json()) as Session);
    };
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [id, phase]);

  async function start() {
    setError(null);
    setPhase("connecting");
    const sid = crypto.randomUUID();
    setId(sid);
    const pc = new PipecatClient({
      transport: new SmallWebRTCTransport(),
      enableMic: true,
      enableCam: false,
      callbacks: {
        onTrackStarted: (track, participant) => {
          if (!participant?.local && track.kind === "audio" && audio.current) audio.current.srcObject = new MediaStream([track]);
        },
        onBotStartedSpeaking: () => setSpeaker("examiner"),
        onUserStartedSpeaking: () => setSpeaker("you"),
        onBotStoppedSpeaking: () => setSpeaker(null),
        onUserStoppedSpeaking: () => setSpeaker(null),
        onDisconnected: () => setPhase("ended"),
      },
    });
    client.current = pc;
    try {
      await pc.connect({ webrtcRequestParams: { endpoint: "/api/speaking/offer", requestData: { session_id: sid } } });
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t reach the examiner.");
      setPhase("idle");
    }
  }

  const parts = session ? (Object.values(session.results) as PartResult[]) : [];
  return (
    <div className="space-y-8">
      <audio ref={audio} autoPlay />
      <div className="rounded-3xl bg-card p-6 ring-1 ring-border">
        <h1 className="text-2xl font-semibold">Speaking test</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          A spoken practice test with an AI examiner: Part 1 questions about yourself, a two-minute talk, then a discussion. Use headphones in a
          quiet room. Each part is scored from your voice once it ends.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {phase === "live" ? (
            <Button variant="outline" onClick={() => client.current?.disconnect()}>
              <PhoneOff /> End test
            </Button>
          ) : (
            <Button size="lg" onClick={start} disabled={phase === "connecting"}>
              {phase === "connecting" ? <LoaderCircle className="animate-spin" /> : <Mic />}
              {phase === "ended" ? "Start a new test" : "Start the test"}
            </Button>
          )}
          {phase === "live" && (
            <p aria-live="polite" className={cn("text-sm font-medium", speaker === "you" ? "text-primary" : "text-muted-foreground")}>
              {speaker === "examiner" ? "The examiner is speaking" : speaker === "you" ? "Listening to you" : "Your turn when you’re ready"}
            </p>
          )}
        </div>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      </div>
      {session && session.scoring > 0 && <p className="text-sm text-muted-foreground">Scoring the part you just finished…</p>}
      {session && Object.entries(session.errors).map(([part, msg]) => (
        <p key={part} className="text-sm text-destructive">{PARTS[part as keyof typeof PARTS]} couldn’t be scored: {msg}</p>
      ))}
      <div className="grid gap-6 lg:grid-cols-3">{parts.map((r) => <PartCard key={r.part} r={r} />)}</div>
    </div>
  );
}
