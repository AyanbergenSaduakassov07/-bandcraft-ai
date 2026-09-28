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
import { Pause, Play } from "lucide-react";
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
                  className="absolute inset-0 flex flex-col justify-end rounded-lg border border-border bg-linear-to-br from-card to-muted p-6 text-left text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.9)] [backface-visibility:hidden]"
                  style={{ transform: `rotateY(${i * 90}deg) translateZ(calc(var(--s) / 2))` }}
                >
                  <span className="text-6xl font-bold tracking-[-0.04em] text-primary">0{i + 1}</span>
                  <span className="mt-2 text-lg leading-tight font-semibold">{CRITERION_LABELS[f.crit]}</span>
                </div>
              ))}
              {[90, -90].map((x) => (
                <div
                  key={x}
                  className="absolute inset-0 rounded-lg bg-primary"
                  style={{ transform: `rotateX(${x}deg) translateZ(calc(var(--s) / 2))` }}
                />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-5xl font-bold tracking-[-0.035em] sm:text-6xl">Four criteria. Equal weight.</h2>
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

const SLIDES = [
  { kicker: "Four criteria", title: "Four bands, judged the way examiners mark.", art: "TR · CC · LR · GRA" },
  { kicker: "Evidence first", title: "It quotes your essay before it scores it.", art: "“ … ”" },
  { kicker: "Honest margins", title: "A band, and exactly how sure we are.", art: "6.5 ± 0.5" },
  { kicker: "Every task", title: "Charts, letters and essays. Task 1 and Task 2.", art: "1A · 1G · 2" },
];
const SLIDE_MS = 5000;

/** Apple's "Get the highlights": autoplaying slides, progress pills that fill, a liquid-glass play/pause. */
export function Highlights() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!motionOK()) setPlaying(false);
  }, []);
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Like Apple's gallery: only advance while the user can see it.
  const running = playing && onScreen;
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [index, running]);
  useEffect(() => {
    const el = track.current;
    const slide = el?.children[index] as HTMLElement | undefined;
    if (el && slide) el.scrollTo({ left: slide.offsetLeft - el.offsetLeft - (el.clientWidth - slide.clientWidth) / 2, behavior: motionOK() ? "smooth" : "auto" });
  }, [index]);

  return (
    <section id="highlights" className="scroll-mt-24 py-24">
      <h2 className="mx-auto max-w-6xl px-4 text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Get the highlights.</h2>
      <div ref={track} className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-hidden px-[8vw]" aria-live="polite">
        {SLIDES.map((s, i) => (
          <article
            key={s.kicker}
            aria-hidden={i !== index}
            className="relative flex aspect-[4/5] w-[84vw] max-w-5xl shrink-0 snap-center flex-col justify-between overflow-hidden rounded-[2rem] bg-muted p-8 sm:aspect-[16/9] sm:p-14"
          >
            <div aria-hidden className="absolute -top-1/3 -right-1/4 size-[70%] rounded-full bg-brand-300/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-semibold text-primary">{s.kicker}</p>
              <h3 className="mt-3 max-w-xl text-3xl leading-tight font-bold tracking-[-0.025em] sm:text-5xl">{s.title}</h3>
            </div>
            <p aria-hidden className="relative bg-linear-to-r from-[#0b1f33] to-[#1565c0] bg-clip-text text-5xl font-bold tracking-[-0.04em] text-transparent sm:text-8xl">
              {s.art}
            </p>
          </article>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-center gap-3">
        <div className="surface-glass flex h-12 items-center gap-2.5 rounded-full px-5 shadow-soft">
          {SLIDES.map((s, i) => (
            <button
              key={s.kicker}
              type="button"
              aria-label={`Show highlight: ${s.kicker}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={`relative h-2 overflow-hidden rounded-full bg-foreground/20 transition-[width] duration-300 ${i === index ? "w-12" : "w-2"}`}
            >
              {i === index && (
                <span
                  key={`${index}-${running}`}
                  className="absolute inset-0 origin-left rounded-full bg-foreground"
                  style={running ? { animation: `highlight-progress ${SLIDE_MS}ms linear forwards` } : { width: "100%" }}
                />
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? "Pause highlights" : "Play highlights"}
          className="surface-glass grid size-12 place-items-center rounded-full shadow-soft"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
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
