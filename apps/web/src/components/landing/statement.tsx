"use client";

import { useEffect, useRef } from "react";
import { animate, onScroll, splitText, stagger } from "animejs";
import { prefersMotion } from "@/lib/motion";

/** Apple-style statement: words light up as they scroll into the middle of the screen. */
export function Statement({ children }: { children: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !prefersMotion()) return;
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
