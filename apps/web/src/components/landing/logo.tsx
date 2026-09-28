import { cn } from "@/lib/utils";

/** The mark: three rising band bars in a rounded square; the dot is where your score lands. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" fill="#1565c0" />
      <rect x="7.5" y="16" width="4" height="9" rx="2" fill="#fff" opacity="0.55" />
      <rect x="14" y="12" width="4" height="13" rx="2" fill="#fff" opacity="0.8" />
      <rect x="20.5" y="8.5" width="4" height="16.5" rx="2" fill="#fff" />
      <circle cx="22.5" cy="5.6" r="1.9" fill="#29b6f6" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
        BandCraft<span className="ml-1 font-medium text-muted-foreground">AI</span>
      </span>
    </span>
  );
}
