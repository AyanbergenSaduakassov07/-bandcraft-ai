"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const LINKS = [
  ["Demo", "#demo"],
  ["How it works", "#how"],
  ["Criteria", "#criteria"],
  ["Specs", "#specs"],
  ["FAQ", "#faq"],
] as const;

/** Floating pill nav (Speak / Apple liquid glass): detached from the edge, gains a shadow once you scroll. */
export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="sticky top-3 z-50 px-3">
      <nav
        aria-label="Main"
        className={cn(
          "surface-glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pr-2 pl-5 transition-shadow duration-300",
          scrolled ? "shadow-[0_8px_30px_rgb(0_0_0/0.08)]" : "shadow-none",
        )}
      >
        <a href="#top" aria-label="BandCraft AI home">
          <Logo />
        </a>
        <ul className="flex gap-7 text-sm text-muted-foreground max-md:hidden">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <a href={href} className="transition-colors duration-150 hover:text-foreground">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#demo" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[filter] duration-150 hover:brightness-110">
          Try the live sample
        </a>
      </nav>
    </div>
  );
}
