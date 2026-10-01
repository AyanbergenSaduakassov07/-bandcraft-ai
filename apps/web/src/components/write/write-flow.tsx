"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Timer } from "lucide-react";
import type { TaskType } from "@bandcraft/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnnotatedScript, ScoreReveal } from "@/components/write/results";
import { Streak } from "@/components/write/streak";
import { wordCount, type FinalResponse } from "@/lib/evidence";
import { cn } from "@/lib/utils";

const TASKS: { id: TaskType; label: string; minutes: number; floor: number; hint: string }[] = [
  { id: "task1_academic", label: "Task 1 Academic", minutes: 20, floor: 150, hint: "Paste the task, and describe the chart, table, map or process in words: what it shows, with the key figures." },
  { id: "task1_general", label: "Task 1 General", minutes: 20, floor: 150, hint: "Paste the letter task, including the three bullet points." },
  { id: "task2", label: "Task 2", minutes: 40, floor: 250, hint: "Paste the essay question." },
];
const DRAFT_KEY = "bandcraft:draft";
const WARN_AT = 5 * 60;

type Draft = { task: TaskType; prompt: string; script: string };

/** Bluebook-style countdown: optional, hideable, and it reappears by itself with five minutes left. */
function useCountdown() {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => setLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return { running: endsAt !== null, left, start: (min: number) => setEndsAt(Date.now() + min * 60_000), stop: () => setEndsAt(null) };
}

function TimerBar({ minutes }: { minutes: number }) {
  const { running, left, start, stop } = useCountdown();
  const [hidden, setHidden] = useState(false);
  const warning = running && left <= WARN_AT;
  if (!running)
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => (start(minutes), setHidden(false))}>
        <Timer /> Start {minutes}-minute timer
      </Button>
    );
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="flex items-center gap-1">
      {/* Bluebook rule: you can hide the clock, but not through the last five minutes. */}
      {(!hidden || warning) && (
        <span role="timer" aria-label={`${clock} remaining`} className={cn("px-2 text-lg font-semibold tabular-nums", warning && "text-destructive")}>
          {left ? clock : "Time’s up"}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {warning && left > 0 ? "Five minutes remaining" : left === 0 ? "Time is up" : ""}
      </span>
      {!warning && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setHidden((h) => !h)} aria-label={hidden ? "Show timer" : "Hide timer"}>
          {hidden ? <Eye /> : <EyeOff />} {hidden ? "Show" : "Hide"}
        </Button>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={stop}>
        Stop
      </Button>
    </div>
  );
}

export function WriteFlow({ practisedAt }: { practisedAt: string[] }) {
  const [draft, setDraft] = useState<Draft>({ task: "task2", prompt: "", script: "" });
  const [phase, setPhase] = useState<"compose" | "scoring" | "result">("compose");
  const [result, setResult] = useState<FinalResponse | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [times, setTimes] = useState(practisedAt);
  const [error, setError] = useState<string | null>(null);

  // Keep the draft across reloads: losing 40 minutes of writing to a refresh is not acceptable.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) setDraft(JSON.parse(saved) as Draft);
    } catch {
      // No storage: the draft lives only in memory.
    }
  }, []);
  const update = (patch: Partial<Draft>) =>
    setDraft((d) => {
      const next = { ...d, ...patch };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

  const task = TASKS.find((t) => t.id === draft.task)!;
  const words = wordCount(draft.script);

  async function submit() {
    setPhase("scoring");
    setError(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task_type: draft.task, prompt: draft.prompt, script: draft.script }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Scoring failed (${res.status}).`);
      setResult(data as FinalResponse);
      setSavedId((data as { saved_id: string | null }).saved_id);
      setPhase("result");
      setTimes((t) => [...t, new Date().toISOString()]);
      scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed.");
      setPhase("compose");
    }
  }

  if (phase === "result" && result)
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setPhase("compose")}>
            <ArrowLeft /> Edit and rescore
          </Button>
          <Button variant="ghost" onClick={() => (update({ prompt: "", script: "" }), setResult(null), setPhase("compose"))}>
            Write a new response
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <ScoreReveal result={result} />
          <Streak practisedAt={times} className="self-start" />
        </div>
        <AnnotatedScript result={result} />
        <p className="text-sm text-muted-foreground">
          {savedId ? (
            <>
              Saved to <Link href="/history" className="font-medium text-primary hover:underline">your history</Link>.
            </>
          ) : (
            "We couldn’t save this one to your history. The score above is still correct."
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Calibration {result.calibration_version} · {result.gemini_models.join(", ")} · scored in {(result.latency_ms / 1000).toFixed(1)}s. BandCraft AI
          isn’t affiliated with IELTS, the British Council, IDP or Cambridge.
        </p>
      </div>
    );

  const scoring = phase === "scoring";
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form
        onSubmit={(e) => (e.preventDefault(), submit())}
        className="space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Task type" className="grid w-full grid-cols-3 rounded-2xl bg-card p-1 ring-1 ring-border sm:inline-flex sm:w-auto sm:rounded-full">
            {TASKS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={draft.task === t.id}
                disabled={scoring}
                onClick={() => update({ task: t.id })}
                className={cn(
                  "min-h-11 rounded-xl px-2 text-sm leading-tight font-medium transition-colors duration-150 sm:rounded-full sm:px-4",
                  draft.task === t.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <TimerBar key={task.minutes} minutes={task.minutes} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prompt">Task prompt</Label>
          <Textarea id="prompt" value={draft.prompt} onChange={(e) => update({ prompt: e.target.value })} placeholder={task.hint} maxLength={4_000} disabled={scoring} className="min-h-24" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="script">Your response</Label>
          <Textarea
            id="script"
            value={draft.script}
            onChange={(e) => update({ script: e.target.value })}
            maxLength={20_000}
            disabled={scoring}
            spellCheck={false}
            aria-describedby="word-count"
            className="min-h-[24rem] text-[1.0625rem] leading-8"
          />
          <p id="word-count" aria-live="polite" className={cn("text-sm tabular-nums", words < task.floor ? "text-muted-foreground" : "text-foreground")}>
            {words} {words === 1 ? "word" : "words"} ·{" "}
            {words < task.floor ? `${task.floor - words} to go for the ${task.floor}-word minimum` : `over the ${task.floor}-word minimum`}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={scoring || !draft.prompt.trim() || !draft.script.trim()}>
            {scoring && <LoaderCircle className="animate-spin" />}
            {scoring ? "Scoring…" : "Score my response"}
          </Button>
          {scoring && <p className="text-sm text-muted-foreground">This usually takes 20–60 seconds. Hard cases get scored twice.</p>}
        </div>
      </form>
      <Streak practisedAt={times} className="self-start" />
    </div>
  );
}
