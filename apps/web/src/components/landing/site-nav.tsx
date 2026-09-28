"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  ["How it works", "#how"],
  ["Criteria", "#criteria"],
  ["Practice", "#practice"],
  ["Design", "/design"],
] as const;

/** Transparent over the hero, glass once you scroll (Apple/Meta). One pill CTA. */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(scrollY > 8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color] duration-200",
        scrolled ? "surface-glass border-x-0 border-t-0" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <a href="#top" className="font-heading text-xl font-black tracking-[-0.02em] text-primary">
          bandcraft<span className="text-brand-cyan">.</span>ai
        </a>
        <div className="flex items-center gap-7 text-sm">
          <ul className="flex gap-7 text-muted-foreground max-md:hidden">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <a href={href} className="transition-colors duration-150 hover:text-foreground">
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#top"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition-[filter] duration-150 hover:brightness-110"
          >
            Get my band
          </a>
        </div>
      </div>
    </nav>
  );
}
