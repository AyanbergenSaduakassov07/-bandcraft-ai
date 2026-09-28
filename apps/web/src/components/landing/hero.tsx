"use client";

import { useState } from "react";
import { Check, Pause, Play } from "lucide-react";
import { CertificateScene } from "./certificate-scene";

const FACTS = ["Task 1 and Task 2", "The four official criteria", "A margin of error on every band"];

/** YC-style split hero on white: the ask on the left, the floating Band Report on the right. */
export function Hero() {
  const [paused, setPaused] = useState(false);
  return (
    <section className="relative overflow-hidden px-4 pt-14 pb-20 sm:pt-20">
      <div aria-hidden className="absolute top-0 left-1/2 -z-10 h-[40rem] w-[70rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgb(30_136_229/0.10),transparent)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <a href="#demo" className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pr-3 pl-1 text-sm text-muted-foreground shadow-soft transition-colors hover:text-foreground">
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-primary">New</span>
            Evidence-first scoring, live on sample essays →
          </a>
          <h1 className="mt-7 text-5xl leading-[1.03] font-bold tracking-[-0.04em] text-balance sm:text-6xl">
            Know your IELTS Writing band. <span className="text-primary">And how sure we are.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
            BandCraft AI scores your essay on the four official criteria, quotes the evidence for every band, and tells you its margin of error.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href="#demo" className="rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_rgb(21_101_192/0.6)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.98]">
              See it score an essay →
            </a>
            <a href="#how" className="rounded-full px-5 py-3.5 text-base font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-muted">
              How it works
            </a>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <Check className="size-4 text-primary" strokeWidth={2.5} /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative aspect-[5/4] w-full">
          <div aria-hidden className="absolute inset-x-[12%] bottom-[6%] h-10 rounded-[50%] bg-black/15 blur-2xl" />
          <CertificateScene paused={paused} />
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play 3D animation" : "Pause 3D animation"}
            className="surface-glass absolute right-2 bottom-2 grid size-9 place-items-center rounded-full text-foreground/70 shadow-soft motion-reduce:hidden"
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
        </div>
      </div>
    </section>
  );
}
