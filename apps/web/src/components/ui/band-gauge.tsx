import { cn } from "@/lib/utils";

/**
 * The logo's dial, as data: the ring is the 0–9 band scale, blue fills to the band,
 * and the cyan arc spans band ± margin. Same geometry language as the mark.
 */
export function BandGauge({
  band,
  margin,
  className,
  label = true,
}: {
  band: number;
  margin?: number;
  className?: string;
  label?: boolean;
}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const frac = (v: number) => Math.min(1, Math.max(0, v / 9));
  const lo = margin === undefined ? band : band - margin;
  const hi = margin === undefined ? band : band + margin;
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={margin === undefined ? `Band ${band}` : `Band ${band} plus or minus ${margin}`}
      className={cn("size-20 -rotate-90", className)}
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--muted)" strokeWidth="11" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="11"
        strokeDasharray={`${frac(band) * c} ${c}`}
        className="transition-[stroke-dasharray] duration-700 ease-out"
      />
      {margin !== undefined && (
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--brand-cyan)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${(frac(hi) - frac(lo)) * c} ${c}`}
          strokeDashoffset={-frac(lo) * c}
        />
      )}
      {label && (
        <text x="50" y="50" dy="0.35em" textAnchor="middle" className="rotate-90 fill-foreground text-[26px] font-bold tabular-nums" style={{ transformOrigin: "50px 50px" }}>
          {band.toFixed(1)}
        </text>
      )}
    </svg>
  );
}
