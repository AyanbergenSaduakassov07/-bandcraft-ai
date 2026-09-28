"use client";

import { useCallback, useEffect, useRef } from "react";
import { spring, createTimeline, splitText, stagger, utils } from "animejs";
import { ChevronRight, RotateCcw } from "lucide-react";
import { CardBody, CardContainer } from "@/components/ui/3d-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { revealStagger, scoreSpring } from "@/lib/motion";
import { HeroScene } from "./hero-scene";
import { SAMPLE_RESULT, ScoreCard } from "./score-card";

/**
 * The one orchestrated moment: headline words rise, the card springs up,
 * the band counts in and lands, criterion bars follow, and the margin arrives last
 * because it's part of the answer, not a footnote.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const cleanup = useRef<() => void>(() => {});

  const play = useCallback(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cleanup.current();

    const headline = el.querySelector<HTMLElement>("h1")!;
    const band = el.querySelector<HTMLElement>("[data-band]")!;
    const card = el.querySelector<HTMLElement>("[data-hero-card]")!;
    const margin = el.querySelector<HTMLElement>("[data-margin]")!;
    const bars = el.querySelectorAll<HTMLElement>("[data-bar]");
    const target = SAMPLE_RESULT.overall.band;

    const split = splitText(headline, { words: true });
    utils.set(headline, { opacity: 1 });
    utils.set(bars, { scaleX: 0 });
    band.textContent = "0.0";

    const landing = spring(scoreSpring);
    const counter = { value: 0 };
    const tl = createTimeline()
      .add(split.words, {
        opacity: [0, 1],
        translateY: ["0.35em", 0],
        duration: 700,
        ease: "out(4)",
        delay: stagger(35),
      }, 0)
      .add(card, { opacity: [0, 1], translateY: [56, 0], ease: landing }, 300)
      .add(counter, {
        value: target,
        ease: landing,
        onUpdate: () => {
          band.textContent = counter.value.toFixed(1);
        },
      }, 500)
      .add(bars, {
        scaleX: (bar: unknown) => Number((bar as HTMLElement).dataset.bar),
        ease: landing,
        delay: stagger(revealStagger),
      }, 600)
      .add(margin, { opacity: [0, 1], translateX: [-8, 0], duration: 300, ease: "out(3)" }, 1300);

    cleanup.current = () => {
      tl.revert();
      split.revert();
    };
  }, []);

  useEffect(() => {
    play();
    return () => cleanup.current();
  }, [play]);

  return (
    <section ref={root} data-hero className="relative isolate overflow-hidden px-4 pt-20 pb-16 text-center sm:pt-28">
      <HeroScene />
      <h1 data-reveal className="mx-auto max-w-3xl text-5xl font-bold tracking-[-0.035em] sm:text-7xl">
        Your band. And how sure we are.
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground sm:text-xl">
        IELTS Writing scored on the four official criteria. Every band comes with its margin of error.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Button size="lg">Score an essay</Button>
        <a href="#motion" className="inline-flex items-center text-lg font-medium text-primary hover:underline">
          How scoring works <ChevronRight className="size-5" />
        </a>
      </div>

      <CardContainer containerClassName="mt-14">
        <CardBody className="w-full max-w-md">
          <div data-hero-card data-reveal className="surface-glass relative rounded-3xl text-left shadow-float">
            <BorderBeam size={120} duration={9} borderWidth={1.5} />
            <ScoreCard result={SAMPLE_RESULT} />
          </div>
        </CardBody>
      </CardContainer>
      <Button variant="ghost" size="sm" className="mt-4" onClick={play}>
        <RotateCcw /> Replay
      </Button>
    </section>
  );
}
