"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createTimeline, spring, stagger, utils } from "animejs";
import { CRITERIA, CRITERION_LABELS, type Criterion } from "@bandcraft/shared";
import { BandGauge } from "@/components/score/band-gauge";
import { DOT, TINT } from "@/components/score/criterion-hues";
import { segments, spans, type FinalResponse } from "@/lib/evidence";
import { prefersMotion, revealStagger, scoreSpring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TASK_LABEL = { task1_academic: "Task 1 Academic", task1_general: "Task 1 General Training", task2: "Task 2" } as const;
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * The score reveal (design system "hero timeline"): the card springs up, the band counts up,
 * and the bars fill in criterion order.
 * Markup holds the final state, so reduced motion or a JS failure shows the true numbers straight away.
 */
export function ScoreReveal({ result, reveal = true }: { result: FinalResponse; reveal?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { overall, criteria } = result;

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !reveal || !prefersMotion()) return;
    const bandEl = root.querySelector<HTMLElement>("[data-band]")!;
    const bars = root.querySelectorAll<HTMLElement>("[data-bar]");
    const counter = { n: 0 };
    const tl = createTimeline()
      .add(root, { opacity: { from: 0 }, translateY: { from: 40 }, scale: { from: 0.96 }, ease: spring(scoreSpring) })
      .add(
        counter,
        {
          n: overall.band,
          ease: spring(scoreSpring),
          // The spring overshoots; the number must not. Showing 6.7 on the way to 6.5 would inflate the score.
          onUpdate: () => (bandEl.textContent = Math.min(counter.n, overall.band).toFixed(1)),
        },
        150,
      )
      // Bars ease out rather than spring, for the same reason: no frame shows more than the band.
      .add(bars, { scaleX: { from: 0 }, duration: 600, ease: "out(3)", delay: stagger(revealStagger) }, 300);
    // Later timeline steps only apply their start values when they begin, so set them now,
    // or the band and bars would show their final values before they animate.
    bandEl.textContent = "0.0";
    utils.set(bars, { scaleX: 0 });
    return () => {
      tl.revert();
      bandEl.textContent = overall.band.toFixed(1);
      bars.forEach((el) => (el.style.transform = `scaleX(${Number(el.dataset.bar)})`));
    };
  }, [overall.band, reveal]);

  return (
    <div ref={ref} className="surface-glass rounded-3xl p-6 shadow-float ring-1 ring-border sm:p-8">
      <p className="text-sm font-medium text-muted-foreground">{TASK_LABEL[result.task_type]} · Overall band estimate</p>
      <div className="mt-3 flex items-center gap-5">
        <BandGauge band={overall.band} label={false} className="size-20 shrink-0" />
        <span data-band className="text-7xl font-bold tracking-[-0.045em] text-primary tabular-nums">
          {overall.band.toFixed(1)}
        </span>
      </div>
      <p className="mt-3 max-w-prose text-sm text-muted-foreground">It’s an estimate, not an official IELTS result.</p>
      <ul className="mt-7 space-y-4">
        {CRITERIA.map((c) => (
          <li key={c}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className={cn("size-2.5 shrink-0 rounded-full", DOT[c])} />
                {CRITERION_LABELS[c]}
              </span>
              <span className="font-semibold tabular-nums">{criteria[c].band}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div data-bar={criteria[c].band / 9} className="h-full origin-left rounded-full bg-brand-500" style={{ transform: `scaleX(${criteria[c].band / 9})` }} />
            </div>
          </li>
        ))}
      </ul>
      {result.second_pass && (
        <p className="mt-6 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          Our models disagreed by more than a band on this response, so it was scored a second time. Both judgements count.
        </p>
      )}
    </div>
  );
}

/** The Script with every verified Evidence Span highlighted and linked to the Criterion Band it supports. */
export function AnnotatedScript({ result }: { result: FinalResponse }) {
  const all = useMemo(() => spans(result.script, result.criteria), [result]);
  const parts = useMemo(() => segments(result.script, all), [result.script, all]);
  // Each located span → the drawn highlight containing it (itself, or the earlier span it overlaps,
  // e.g. the same sentence quoted by both Gemini passes).
  const markOf = useMemo(() => {
    const marks = parts.flatMap((p) => (p.span ? [p.span] : []));
    return new Map(all.map((s) => [s.id, marks.find((m) => s.start >= m.start && s.start < m.end)!.id]));
  }, [all, parts]);
  const [active, setActive] = useState<Criterion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const select = (c: Criterion, id: string, scroll: boolean) => {
    setActive(c);
    setSelected(id);
    if (scroll) document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: prefersMotion() ? "smooth" : "auto", block: "center" });
  };

  return (
    <div className="grid overflow-hidden rounded-3xl bg-card ring-1 ring-border lg:grid-cols-[1.4fr_1fr]">
      <div className="p-6 sm:p-9">
        <h2 className="text-xl font-semibold">Your response, marked up</h2>
        <p className="mt-1 text-sm text-muted-foreground">Each highlight is a passage the scorer quoted as evidence. Select one to see what it shows.</p>
        <div className="mt-6 text-[1.0625rem] leading-8 whitespace-pre-wrap">
          {parts.map((p, i) =>
            p.span ? (
              <mark
                key={i}
                id={`ev-${p.span.id}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected === p.span.id}
                aria-label={`${CRITERION_LABELS[p.span.c]} evidence: ${p.text}`}
                onClick={() => select(p.span!.c, p.span!.id, false)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), select(p.span!.c, p.span!.id, false))}
                className={cn(
                  "cursor-pointer rounded px-0.5 text-foreground underline decoration-2 underline-offset-4 transition-opacity duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  TINT[p.span.c],
                  active && active !== p.span.c && "opacity-35",
                  selected === p.span.id && "ring-2 ring-foreground/60",
                )}
              >
                {p.text}
              </mark>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </div>
      </div>

      <aside className="border-t border-border bg-muted/60 p-6 sm:p-9 lg:border-t-0 lg:border-l">
        <h2 className="text-xl font-semibold">Evidence by criterion</h2>
        <div className="mt-5 space-y-3">
          {CRITERIA.map((c) => {
            const s = result.criteria[c];
            const open = active === c;
            return (
              <div key={c} className={cn("rounded-2xl bg-card ring-1 transition-shadow", open ? "shadow-soft ring-foreground/15" : "ring-border")}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => (setActive(open ? null : c), setSelected(null))}
                  className="flex w-full min-h-11 items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className={cn("size-2.5 shrink-0 rounded-full", DOT[c])} />
                    {CRITERION_LABELS[c]}
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{s.band}</span>
                </button>
                {open && (
                  <div className="space-y-3 px-4 pb-4">
                    {s.evidence.length === 0 && <p className="text-sm text-muted-foreground">The scorer quoted no evidence for this criterion.</p>}
                    {s.evidence.map((e, i) => {
                      const id = `${c}-${i}`;
                      const mark = markOf.get(id);
                      return (
                        <figure key={id} className={cn("rounded-xl border-l-4 bg-muted/60 px-3 py-2.5 text-sm", mark && selected === mark ? "border-foreground/60" : "border-transparent")}>
                          {mark ? (
                            <button type="button" onClick={() => select(c, mark, true)} className="text-left font-medium underline-offset-4 hover:underline">
                              “{e.quote}”
                            </button>
                          ) : (
                            <blockquote className="font-medium">“{e.quote}”</blockquote>
                          )}
                          <figcaption className="mt-1 text-muted-foreground">{e.observation}</figcaption>
                          {!mark && <p className="mt-1 text-xs text-muted-foreground">Not found word for word in your response, so it doesn’t count as evidence.</p>}
                        </figure>
                      );
                    })}
                    <PathsNote paths={s.paths} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

/** The independent estimates behind a Criterion Band. */
function PathsNote({ paths }: { paths: FinalResponse["criteria"][Criterion]["paths"] }) {
  const rows: [string, string][] = [
    [paths.gemini.length > 1 ? "Language model (two passes)" : "Language model", paths.gemini.map(fmt).join(" and ")],
    ["Calibrated language model", paths.calibrated.toFixed(1)],
    ["Text features only, no AI", paths.deterministic.toFixed(1)],
    ["Ensemble", paths.ensemble.toFixed(1)],
  ];
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">How we got this band</summary>
      <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
