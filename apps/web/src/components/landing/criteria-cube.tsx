"use client";

import { useEffect, useRef, useState } from "react";
import { animate, onScroll } from "animejs";
import { CRITERIA, CRITERION_LABELS } from "@bandcraft/shared";
import { prefersMotion } from "@/lib/motion";

const FACES = [
  { crit: CRITERIA[0], blurb: "Did you answer every part of the question you were given?" },
  { crit: CRITERIA[1], blurb: "Does it flow? Clear paragraphs, natural linking, no repetition." },
  { crit: CRITERIA[2], blurb: "Precise, varied vocabulary, correct collocations and spelling." },
  { crit: CRITERIA[3], blurb: "A mix of sentence structures, used accurately." },
];

/** Sticky scrollytelling: the cube turns one face per criterion as you scroll. */
export function CriteriaCube() {
  const section = useRef<HTMLElement>(null);
  const cube = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!section.current || !cube.current || !prefersMotion()) return;
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
            <h2 className="text-5xl font-bold tracking-[-0.035em] sm:text-6xl">Four criteria. Each one counts.</h2>
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
