"use client";

import { useMemo, useState } from "react";
import { CRITERION_LABELS, type Criterion } from "@bandcraft/shared";
import { cn } from "@/lib/utils";
import results from "@/content/demo-results.json";
import { DOT, TINT } from "@/components/score/criterion-hues";
import { segments, spans, type Evidence } from "@/lib/evidence";

type Essay = {
  id: string;
  prompt: string;
  script: string;
  model: string;
  overall_raw: number;
  criteria: Record<Criterion, { band: number; analysis: string; evidence: Evidence[] }>;
};

const TABS = ["Weaker essay", "Middle essay", "Stronger essay"];

/** Speak-style product card, fed by real engine output recorded from the draft stage. */
export function Demo() {
  const essays = results.essays as unknown as Essay[];
  const [tab, setTab] = useState(Math.min(1, essays.length - 1));
  const essay = essays[tab];
  const parts = useMemo(() => (essay ? segments(essay.script, spans(essay.script, essay.criteria)) : []), [essay]);
  if (!essay) return null; // no recorded output yet: show nothing rather than placeholder scores

  return (
    <section id="demo" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold text-primary">Live sample</p>
        <h2 className="mt-2 max-w-2xl text-4xl font-bold tracking-[-0.035em] sm:text-5xl">See exactly why your essay got that band.</h2>
        <div role="tablist" aria-label="Sample essays" className="mt-8 inline-flex rounded-full bg-muted p-1">
          {TABS.slice(0, essays.length).map((t, i) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === i}
              onClick={() => setTab(i)}
              className={cn("rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150", tab === i ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
            >
              {t}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="mt-6 grid overflow-hidden rounded-3xl bg-card shadow-float ring-1 ring-border lg:grid-cols-[1.25fr_1fr]">
          <div className="max-h-[38rem] overflow-y-auto p-7 sm:p-9">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Task 2 prompt</p>
            <p className="mt-1 text-sm text-muted-foreground">{essay.prompt}</p>
            <div className="mt-6 text-[0.95rem] leading-7 whitespace-pre-wrap">
              {parts.map((p, i) =>
                p.span ? (
                  <mark
                    key={i}
                    title={`${CRITERION_LABELS[p.span.c]}: ${p.span.observation}`}
                    className={cn("rounded px-0.5 text-foreground underline decoration-2 underline-offset-4", TINT[p.span.c])}
                  >
                    {p.text}
                  </mark>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </div>
          </div>
          <div className="border-t border-border bg-muted/60 p-7 sm:p-9 lg:border-t-0 lg:border-l">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">Draft overall</p>
              <p className="text-5xl font-bold tracking-[-0.04em] tabular-nums">{essay.overall_raw.toFixed(1)}</p>
            </div>
            <ul className="mt-6 space-y-5">
              {(Object.entries(essay.criteria) as [Criterion, Essay["criteria"][Criterion]][]).map(([c, s]) => (
                <li key={c}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className={cn("size-2.5 rounded-full", DOT[c])} />
                      {CRITERION_LABELS[c]}
                    </span>
                    <span className="text-lg font-bold tabular-nums">{s.band}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{s.analysis}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              Real output from our scoring engine ({essay.model}), recorded {results.recorded}. This is the draft stage: bands are raw and
              uncalibrated. Highlights are the model’s quoted evidence, each checked against the essay.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
