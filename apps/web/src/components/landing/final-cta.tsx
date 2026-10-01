import Link from "next/link";
import { APP_CTA } from "@/lib/cta";

/** Closing call to action: centred, confident, one blue pill. */
export function FinalCta() {
  return (
    <section id="final" className="relative isolate scroll-mt-24 overflow-hidden px-4 py-32 text-center">
      <div aria-hidden className="absolute top-1/2 left-1/2 -z-10 h-[36rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgb(30_136_229/0.12),transparent)]" />
      <h2 className="mx-auto max-w-3xl text-5xl leading-[1.02] font-bold tracking-[-0.045em] sm:text-7xl">Walk into the exam knowing where you stand.</h2>
      <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
        Four criteria and the evidence behind every band. No guesswork, no inflated scores.
      </p>
      <Link href={APP_CTA.href} className="mt-10 inline-block rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgb(21_101_192/0.6)] transition-[filter] duration-150 hover:brightness-110">
        {APP_CTA.label} →
      </Link>
    </section>
  );
}
