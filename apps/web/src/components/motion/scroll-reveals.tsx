"use client";

import { useEffect, useRef } from "react";
import { animate, createDrawable, createTimeline, onScroll, spring, stagger, utils } from "animejs";
import { prefersMotion, revealStagger, scoreSpring } from "@/lib/motion";

/**
 * Scroll-triggered reveals for the component catalog, keyed off data-anim hooks.
 * Runs once per element; under reduced motion nothing is touched.
 */
export function ScrollReveals({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !prefersMotion()) return;
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
