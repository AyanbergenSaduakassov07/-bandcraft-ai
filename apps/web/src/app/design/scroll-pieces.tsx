"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  createDrawable,
  spring,
  createTimeline,
  onScroll,
  splitText,
  stagger,
  utils,
} from "animejs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CRITERIA, CRITERION_LABELS } from "@bandcraft/shared";
import { Button } from "@/components/ui/button";
import { revealStagger, scoreSpring } from "@/lib/motion";

const motionOK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Apple-style statement: words light up as they scroll into the middle of the screen. */
export function Statement({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motionOK()) return;
    const split = splitText(el, { words: true });
    const anim = animate(split.words, {
      opacity: [0.15, 1],
      ease: "linear",
      delay: stagger(40),
      autoplay: onScroll({ target: el, enter: "bottom top", leave: "center center", sync: 0.4 }),
    });
    return () => {
      anim.revert();
      split.revert();
    };
  }, []);
  return (
    <p ref={ref} className="mx-auto max-w-4xl text-4xl leading-tight font-bold tracking-[-0.03em] text-balance sm:text-6xl">
      {children}
    </p>
  );
}

const FACES = [
  { crit: CRITERIA[0], blurb: "Did you answer the question you were given, fully?" },
  { crit: CRITERIA[1], blurb: "Does it flow? Paragraphing, linking, referencing." },
  { crit: CRITERIA[2], blurb: "Range and precision of vocabulary, collocation, spelling." },
  { crit: CRITERIA[3], blurb: "Sentence variety and how often it goes wrong." },
];

/** Sticky scrollytelling: the cube turns one face per criterion as you scroll. */
export function CriteriaCube() {
  const section = useRef<HTMLElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!section.current || !cube.current || !motionOK()) return;
    const anim = animate(cube.current, {
      rotateY: [20, -290],
      rotateX: [-18, -8],
      ease: "inOut(2)",
      autoplay: onScroll({
        target: section.current,
        enter: "top top",
        leave: "bottom bottom",
        sync: 0.25,
        onUpdate: (obs) => setActive(Math.min(3, Math.floor(obs.progress * 4))),
      }),
    });
    return () => {
      anim.revert();
    };
  }, []);

  return (
    <section ref={section} className="relative motion-safe:h-[320vh]">
      <div className="flex min-h-dvh items-center motion-safe:sticky motion-safe:top-0">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
          <div className="flex justify-center [perspective:1200px]">
            <div
              ref={cube}
              aria-hidden
              className="relative size-(--s) [--s:14rem] [transform-style:preserve-3d] sm:[--s:18rem]"
              style={{ transform: "rotateX(-12deg) rotateY(-30deg)" }}
            >
              {FACES.map((f, i) => (
                <div
                  key={f.crit}
                  className={`absolute inset-0 flex flex-col justify-end rounded-lg border border-white/15 p-6 text-left text-white [backface-visibility:hidden] ${i % 2 ? "bg-[#0b1f33]" : "bg-brand-700"}`}
                  style={{ transform: `rotateY(${i * 90}deg) translateZ(calc(var(--s) / 2))` }}
                >
                  <span className="font-display text-5xl font-bold text-brand-300">0{i + 1}</span>
                  <span className="mt-2 text-lg leading-tight font-semibold">{CRITERION_LABELS[f.crit]}</span>
                </div>
              ))}
              {[90, -90].map((x) => (
                <div
                  key={x}
                  className="bg-brand-gradient absolute inset-0 rounded-lg"
                  style={{ transform: `rotateX(${x}deg) translateZ(calc(var(--s) / 2))` }}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Four criteria. Equal weight.</h2>
            <ol className="mt-8 space-y-5">
              {FACES.map((f, i) => (
                <li
                  key={f.crit}
                  className="transition-opacity duration-300 ease-out"
                  style={{ opacity: active === null || active === i ? 1 : 0.35 }}
                >
                  <p className="font-semibold">{CRITERION_LABELS[f.crit]}</p>
                  <p className="text-muted-foreground">{f.blurb}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

const FEEDBACK = [
  { crit: CRITERIA[0], band: 7, margin: 0.5, quote: "“Universities should do both”", note: "Your position is clear from the introduction and holds to the end. Body 2 asserts more than it argues: add one concrete example." },
  { crit: CRITERIA[1], band: 6, margin: 0.5, quote: "“Furthermore… Moreover… Furthermore…”", note: "Three stacked linkers in one paragraph. Let the ideas connect themselves; keep one linker, use reference words for the rest." },
  { crit: CRITERIA[2], band: 6, margin: 1, quote: "“do a job”", note: "Imprecise. Try “pursue a career” or “perform a role”. Two spelling slips in less common words cost you here." },
  { crit: CRITERIA[3], band: 7, margin: 0.5, quote: "“If students were taught…, they would…”", note: "Good control of conditionals and relative clauses. Article errors recur (“the society”), but rarely block meaning." },
];

/** Apple-style horizontal gallery: native scroll-snap, paddles for pointer users. */
export function FeedbackGallery() {
  const track = useRef<HTMLDivElement>(null);
  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: motionOK() ? "smooth" : "auto" });
  };
  return (
    <div>
      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[max(1rem,calc((100vw_-_72rem)/2))] scroll-px-[max(1rem,calc((100vw_-_72rem)/2))] pb-6 [scrollbar-width:none]"
      >
        {FEEDBACK.map((f) => (
          <article
            key={f.crit}
            className="flex min-h-[26rem] w-[82vw] max-w-[24rem] shrink-0 snap-center flex-col rounded-[1.75rem] bg-card p-8 shadow-soft ring-1 ring-border sm:snap-start"
          >
            <p className="text-sm font-semibold text-primary">{CRITERION_LABELS[f.crit]}</p>
            <p className="mt-3 flex items-baseline gap-2 font-display font-bold">
              <span className="text-5xl">{f.band}</span>
              <span className="text-xl text-muted-foreground">± {f.margin}</span>
            </p>
            <blockquote className="mt-6 text-xl font-semibold tracking-[-0.015em]">{f.quote}</blockquote>
            <p className="mt-auto pt-6 text-muted-foreground">{f.note}</p>
          </article>
        ))}
      </div>
      <div className="mx-auto mt-2 flex max-w-6xl justify-end gap-3 px-4">
        <Button variant="secondary" size="icon" className="rounded-full shadow-none" aria-label="Previous" onClick={() => page(-1)}>
          <ChevronLeft />
        </Button>
        <Button variant="secondary" size="icon" className="rounded-full shadow-none" aria-label="Next" onClick={() => page(1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

/**
 * Scroll-triggered reveals for the component catalog, keyed off data-anim hooks.
 * Runs once per element; under reduced motion nothing is touched.
 */
export function ScrollReveals({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !motionOK()) return;
    const landing = spring(scoreSpring);
    const once = (target: Element) => onScroll({ target, enter: "bottom top", repeat: false });
    const anims: { revert: () => unknown }[] = [];
    const q = (s: string) => root.querySelector<HTMLElement>(`[data-anim="${s}"]`);

    const swatches = q("swatches");
    if (swatches) {
      utils.set(swatches.children, { opacity: 0, scale: 0.6 });
      anims.push(animate(swatches.children, { opacity: 1, scale: 1, ease: landing, delay: stagger(35), autoplay: once(swatches) }));
    }
    const heatmap = q("heatmap");
    if (heatmap) {
      utils.set(heatmap.children, { opacity: 0, scale: 0 });
      anims.push(
        animate(heatmap.children, {
          opacity: 1,
          scale: 1,
          duration: 450,
          ease: "out(3)",
          delay: stagger(14, { grid: [7, 12], from: "center" }),
          autoplay: once(heatmap),
        }),
      );
    }
    const trend = q("trend");
    if (trend) {
      const line = createDrawable(trend.querySelector("polyline")!);
      const dots = trend.querySelectorAll("circle");
      utils.set(dots, { opacity: 0 });
      anims.push(
        createTimeline({ autoplay: once(trend) })
          .add(line, { draw: ["0 0", "0 1"], duration: 1200, ease: "inOut(3)" })
          .add(dots, { opacity: [0, 1], duration: 250, delay: stagger(120) }, 150),
      );
    }
    const bars = root.querySelectorAll<HTMLElement>("[data-bar]");
    if (bars.length) {
      utils.set(bars, { scaleX: 0 });
      anims.push(
        animate(bars, {
          scaleX: (bar: unknown) => Number((bar as HTMLElement).dataset.bar),
          ease: landing,
          delay: stagger(revealStagger),
          autoplay: once(bars[0].closest("ul")!),
        }),
      );
    }
    return () => anims.forEach((a) => a.revert());
  }, []);
  return <div ref={ref}>{children}</div>;
}
