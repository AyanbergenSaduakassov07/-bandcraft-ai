"use client"

// Magic UI number-ticker, ported to anime.js so the app runs a single animation engine.
// Counts up with the score spring when scrolled into view; jumps to the value under reduced motion.

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react"
import { animate, onScroll, spring } from "animejs"

import { scoreSpring } from "@/lib/motion"
import { cn } from "@/lib/utils"

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number
  startValue?: number
  delay?: number
  decimalPlaces?: number
}

export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const format = (n: number) =>
      Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(n)
    const counter = { n: startValue }
    el.textContent = format(startValue)
    const anim = animate(counter, {
      n: value,
      delay: delay * 1000,
      ease: spring(scoreSpring),
      onUpdate: () => {
        el.textContent = format(counter.n)
      },
      autoplay: onScroll({ target: el, enter: "bottom top", repeat: false }),
    })
    return () => {
      anim.revert()
      el.textContent = format(value)
    }
  }, [value, startValue, delay, decimalPlaces])

  // Server render and no-JS show the final value.
  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)} {...props}>
      {value.toFixed(decimalPlaces)}
    </span>
  )
}
