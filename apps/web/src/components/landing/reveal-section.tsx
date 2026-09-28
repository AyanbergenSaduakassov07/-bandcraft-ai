"use client";

import { useCallback, useEffect, useRef } from "react";
import { createTimeline, onScroll, spring, stagger, utils } from "animejs";
import { RotateCcw } from "lucide-react";
import { CardBody, CardContainer } from "@/components/ui/3d-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { revealStagger, scoreSpring } from "@/lib/motion";
import { SAMPLE_RESULT, ScoreCard } from "./score-card";

/**
 * Meta-style full-bleed dark stage for the one orchestrated moment: the card springs up,
 * the band counts in and lands, bars follow, and the margin arrives last.
 */
export function RevealSection() {
  const root = useRef<HTMLElement>(null);
  const cleanup = useRef<() => void>(() => {});

  const play = useCallback((autoplay: boolean) => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cleanup.current();
    const band = el.querySelector<HTMLElement>("[data-band]")!;
    const card = el.querySelector<HTMLElement>("[data-hero-card]")!;
    const margin = el.querySelector<HTMLElement>("[data-margin]")!;
    const bars = el.querySelectorAll<HTMLElement>("[data-bar]");
    const target = SAMPLE_RESULT.overall.band;
    utils.set(bars, { scaleX: 0 });
    utils.set([card, margin], { opacity: 0 });
    band.textContent = "0.0";

    const landing = spring(scoreSpring);
    const counter = { value: 0 };
    const tl = createTimeline({ autoplay: autoplay ? true : onScroll({ target: card, enter: "bottom top", repeat: false }) })
      .add(card, { opacity: [0, 1], translateY: [64, 0], ease: landing }, 0)
      .add(counter, { value: target, ease: landing, onUpdate: () => void (band.textContent = counter.value.toFixed(1)) }, 200)
      .add(bars, { scaleX: (bar: unknown) => Number((bar as HTMLElement).dataset.bar), ease: landing, delay: stagger(revealStagger) }, 300)
      .add(margin, { opacity: [0, 1], translateX: [-8, 0], duration: 300, ease: "out(3)" }, 1000);
    cleanup.current = () => tl.revert();
  }, []);

  useEffect(() => {
    play(false);
    return () => cleanup.current();
  }, [play]);

  return (
    <section id="how" ref={root} className="dark scroll-mt-14 overflow-hidden bg-background px-4 py-28 text-center text-foreground sm:py-36">
      <p className="text-sm font-bold tracking-widest text-brand-300 uppercase">How it scores</p>
      <h2 className="mx-auto mt-3 max-w-3xl text-5xl leading-[1.05] font-black sm:text-7xl">
        Your band. And how sure we are.
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
        A band without a margin is a guess. Every score you see carries its ± so you know how much to trust it.
      </p>
      <CardContainer containerClassName="mt-14">
        <CardBody className="w-full max-w-md">
          <div data-hero-card className="relative rounded-3xl bg-card text-left shadow-[0_40px_120px_-40px_rgb(41_182_246/0.45)] ring-1 ring-border">
            <BorderBeam size={140} duration={9} borderWidth={1.5} />
            <ScoreCard result={SAMPLE_RESULT} />
          </div>
        </CardBody>
      </CardContainer>
      <button
        type="button"
        onClick={() => play(true)}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-[filter] duration-150 hover:brightness-110"
      >
        <RotateCcw className="size-4" /> Watch it score again
      </button>
    </section>
  );
}
