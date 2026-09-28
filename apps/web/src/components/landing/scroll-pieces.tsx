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
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CRITERIA, CRITERION_LABELS } from "@bandcraft/shared";
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

const CARDS = [
  { eyebrow: "Evidence first", title: "It quotes your essay before it scores it.", art: "“ ”", href: "#how", dark: false },
  { eyebrow: "Four criteria", title: "Four bands, not one vague number.", art: "TR CC LR GRA", href: "#criteria", dark: true },
  { eyebrow: "Every task", title: "Charts, letters and essays.", art: "1A 1G 2", href: "#top", dark: false },
  { eyebrow: "Honest margins", title: "A band and how sure we are.", art: "± 0.5", href: "#how", dark: true },
  { eyebrow: "Daily practice", title: "Small drills. Real streaks.", art: "12", href: "#practice", dark: false },
];

/** Apple's "Get to know" row: tall light and dark cards, snap scrolling, round paddles, a + per card. */
export function GetToKnow() {
  const track = useRef<HTMLDivElement>(null);
  const page = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: motionOK() ? "smooth" : "auto" });
  };
  return (
    <section className="bg-muted/60 py-24">
      <h2 className="mx-auto max-w-6xl px-4 text-4xl font-black sm:text-6xl">Get to know BandCraft.</h2>
      <div
        ref={track}
        className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[max(1rem,calc((100vw_-_72rem)/2))] pb-6 [scrollbar-width:none] scroll-px-[max(1rem,calc((100vw_-_72rem)/2))]"
      >
        {CARDS.map((c) => (
          <article
            key={c.eyebrow}
            className={`relative flex h-[30rem] w-[78vw] max-w-[21rem] shrink-0 snap-start flex-col overflow-hidden rounded-[1.75rem] p-8 ${
              c.dark ? "dark bg-background text-foreground" : "bg-card text-card-foreground"
            }`}
          >
            <p className="text-sm font-bold">{c.eyebrow}</p>
            <h3 className="mt-2 text-[1.7rem] leading-tight font-extrabold">{c.title}</h3>
            <p aria-hidden className="text-brand-gradient mt-auto pr-12 font-display text-6xl leading-none font-black">
              {c.art}
            </p>
            <a
              href={c.href}
              aria-label={`More about: ${c.eyebrow}`}
              className="absolute right-6 bottom-6 grid size-9 place-items-center rounded-full bg-foreground text-background transition-transform duration-150 hover:scale-110"
            >
              <Plus className="size-5" strokeWidth={3} />
            </a>
          </article>
        ))}
      </div>
      <div className="mx-auto mt-2 flex max-w-6xl justify-end gap-3 px-4">
        <button type="button" aria-label="Previous" onClick={() => page(-1)} className="grid size-9 place-items-center rounded-full bg-foreground/10 hover:bg-foreground/15">
          <ChevronLeft className="size-5" />
        </button>
        <button type="button" aria-label="Next" onClick={() => page(1)} className="grid size-9 place-items-center rounded-full bg-foreground/10 hover:bg-foreground/15">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </section>
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

    root.querySelectorAll<HTMLElement>('[data-anim="pop"]').forEach((el) => {
      utils.set(el, { opacity: 0, translateY: 40, scale: 0.96 });
      anims.push(animate(el, { opacity: 1, translateY: 0, scale: 1, ease: landing, autoplay: once(el) }));
    });
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
