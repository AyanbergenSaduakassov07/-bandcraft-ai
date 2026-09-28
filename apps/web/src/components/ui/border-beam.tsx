// Magic UI border-beam, ported to pure CSS (offset-path + keyframes): no JS, no animation library.
// Hidden under reduced motion.

import { cn } from "@/lib/utils"

interface BorderBeamProps {
  size?: number
  /** Seconds per lap. */
  duration?: number
  /** Seconds. */
  delay?: number
  colorFrom?: string
  colorTo?: string
  className?: string
  reverse?: boolean
  borderWidth?: number
}

export const BorderBeam = ({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "var(--brand-cyan)",
  colorTo = "var(--brand-500)",
  reverse = false,
  borderWidth = 1,
}: BorderBeamProps) => {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit] border-(length:--border-beam-width) border-transparent mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box] motion-reduce:hidden"
      style={{ "--border-beam-width": `${borderWidth}px` } as React.CSSProperties}
    >
      <div
        className={cn(
          "absolute aspect-square animate-[border-beam_linear_infinite] bg-linear-to-l from-(--color-from) via-(--color-to) to-transparent",
          className
        )}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            animationDuration: `${duration}s`,
            animationDelay: `${-delay}s`,
            animationDirection: reverse ? "reverse" : "normal",
            "--color-from": colorFrom,
            "--color-to": colorTo,
          } as React.CSSProperties
        }
      />
    </div>
  )
}
