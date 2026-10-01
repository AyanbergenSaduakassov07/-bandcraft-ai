import { cn } from "@/lib/utils";

/**
 * The logo's dial, as data: the ring is the 0–9 band scale and blue fills to the band.
 * Same geometry language as the mark.
 */
export function BandGauge({
  band,
  className,
  label = true,
}: {
  band: number;
  className?: string;
  label?: boolean;
}) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const frac = (v: number) => Math.min(1, Math.max(0, v / 9));
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={`Band ${band}`}
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
      {label && (
        <text x="50" y="50" dy="0.35em" textAnchor="middle" className="rotate-90 fill-foreground text-[26px] font-bold tabular-nums" style={{ transformOrigin: "50px 50px" }}>
          {band.toFixed(1)}
        </text>
      )}
    </svg>
  );
}
