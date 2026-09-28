import { cn } from "@/lib/utils";

/**
 * The BandCraft mark: a lowercase "b" whose bowl is a score dial. The cyan arc is the margin of error,
 * centred on the reading. Construction (48-unit grid): stem 6.5 wide, ring r 10.2 at (27, 30), stroke 6.5,
 * margin arc from -78° to -22°. See design-system/brand.md.
 */
export const MARK = {
  stem: { x: 10, y: 6, width: 6.5, height: 36, rx: 3.25 },
  ring: { cx: 27, cy: 30, r: 10.2, stroke: 6.5 },
  arc: "M29.12 20.02 A10.2 10.2 0 0 1 36.46 26.18",
} as const;

type Tone = "color" | "reversed" | "mono";
const TONES: Record<Tone, { fg: string; acc: string }> = {
  color: { fg: "#1565c0", acc: "#29b6f6" },
  reversed: { fg: "#ffffff", acc: "#29b6f6" },
  mono: { fg: "currentColor", acc: "currentColor" },
};

export function LogoMark({ className, tone = "color" }: { className?: string; tone?: Tone }) {
  const { fg, acc } = TONES[tone];
  const { stem, ring, arc } = MARK;
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn("size-8", className)}>
      <rect {...stem} fill={fg} />
      <circle cx={ring.cx} cy={ring.cy} r={ring.r} fill="none" stroke={fg} strokeWidth={ring.stroke} />
      <path d={arc} fill="none" stroke={acc} strokeWidth={ring.stroke} strokeLinecap="round" />
    </svg>
  );
}

/** App-icon tile: reversed mark on the primary blue, iOS-style corner radius. */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span className={cn("grid size-9 place-items-center rounded-[28%] bg-[#1565c0]", className)}>
      <LogoMark tone="reversed" className="size-[72%]" />
    </span>
  );
}

export function Logo({ className, tone = "color" }: { className?: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <LogoMark tone={tone} className="size-8" />
      <span className={cn("text-[1.35rem] leading-none font-bold tracking-[-0.05em]", tone === "reversed" ? "text-white" : "text-foreground")}>
        bandcraft
      </span>
    </span>
  );
}
