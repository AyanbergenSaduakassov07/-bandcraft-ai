"use client";

import { useState } from "react";
import { BarChart3, FileText, Mail, Pause, Play, Sparkles, SpellCheck, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroScene } from "./hero-scene";

const TASKS = [
  [BarChart3, "Task 1 Academic"],
  [Mail, "Task 1 General"],
  [FileText, "Task 2 Essay"],
  [Workflow, "Coherence"],
  [SpellCheck, "Vocabulary"],
  [Sparkles, "Grammar"],
] as const;

/** Duolingo's hero shape: the 3D IELTS scene takes the mascot's place, the ask sits beside it. */
export function Hero() {
  const [paused, setPaused] = useState(false);
  return (
    <section className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 py-10 md:grid-cols-2 md:gap-12">
        <div className="relative aspect-square w-full max-md:max-h-[46vh]">
          <HeroScene paused={paused} />
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play 3D animation" : "Pause 3D animation"}
            className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-foreground/80 text-background transition-opacity duration-150 hover:opacity-100 motion-reduce:hidden md:opacity-60"
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
          <h1 className="text-[2.1rem] leading-[1.15] font-black text-foreground/85 sm:text-[2.6rem]">
            The honest way to know your IELTS Writing band.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Scored on the four official criteria. Every band comes with its margin of error.
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <Button size="lg" className="h-13 w-full text-base font-extrabold tracking-wider uppercase">
              Get my band
            </Button>
            <Button variant="ledge" size="lg" className="h-13 w-full text-base font-extrabold tracking-wider uppercase">
              I already have an account
            </Button>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <ul className="mx-auto flex max-w-6xl gap-8 overflow-x-auto px-4 py-4 text-sm font-extrabold tracking-wider text-muted-foreground uppercase [scrollbar-width:none] md:justify-center">
          {TASKS.map(([Icon, label]) => (
            <li key={label} className="flex shrink-0 items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-secondary text-primary">
                <Icon className="size-4" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
