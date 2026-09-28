"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { prefersMotion } from "@/lib/motion";

const SLIDES = [
  { kicker: "Four criteria", title: "Find the one criterion holding your band back.", art: "TR · CC · LR · GRA" },
  { kicker: "Evidence first", title: "Every score points to the sentences behind it.", art: "“ … ”" },
  { kicker: "Honest margins", title: "No inflated numbers. Just your band and its range.", art: "6.5 ± 0.5" },
  { kicker: "Every task", title: "Charts, letters and essays, Task 1 and Task 2.", art: "1A · 1G · 2" },
];
const SLIDE_MS = 5000;

/** Apple's "Get the highlights": autoplaying slides, progress pills that fill, a liquid-glass play/pause. */
export function Highlights() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!prefersMotion()) setPlaying(false);
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
    if (el && slide) el.scrollTo({ left: slide.offsetLeft - el.offsetLeft - (el.clientWidth - slide.clientWidth) / 2, behavior: prefersMotion() ? "smooth" : "auto" });
  }, [index]);

  return (
    <section id="highlights" className="scroll-mt-24 py-24">
      <h2 className="mx-auto max-w-6xl px-4 text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Built for the band you need.</h2>
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
