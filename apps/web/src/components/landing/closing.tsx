import Link from "next/link";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Button } from "@/components/ui/button";

const SPECS = [
  { value: 4, suffix: "", label: "official criteria, scored separately" },
  { value: 9, suffix: ".0", label: "top of the band scale, in half steps" },
  { value: 6, suffix: "", label: "pipeline stages from essay to band" },
  { value: 1, suffix: "", label: "margin of error on every band shown" },
];

/** Premium-brand spec sheet: dark, thin rules, big light numerals, small labels. */
export function SpecStrip() {
  return (
    <section className="dark bg-background px-4 py-24 text-foreground">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold tracking-widest text-brand-300 uppercase">By the numbers</p>
        <dl className="mt-10 grid grid-cols-2 border-t border-border md:grid-cols-4">
          {SPECS.map((s) => (
            <div key={s.label} className="border-b border-border py-8 pr-6 md:border-b-0 md:border-l md:pl-6 md:first:border-l-0 md:first:pl-0">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="font-display text-7xl leading-none font-light tracking-tight">
                  <NumberTicker value={s.value} />
                  {s.suffix}
                </span>
                <p className="mt-3 max-w-[12rem] text-sm text-muted-foreground">{s.label}</p>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-4 py-32 text-center">
      <h2 className="mx-auto max-w-3xl text-5xl leading-none font-black text-primary sm:text-7xl">write. get scored. improve.</h2>
      <p className="mx-auto mt-5 max-w-lg text-lg text-muted-foreground">Paste a Task 1 or Task 2 response and see your band with its margin of error.</p>
      <Button size="lg" className="mt-10 h-14 px-10 text-base font-extrabold tracking-wider uppercase">
        Get my band
      </Button>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-10 text-xs leading-relaxed text-muted-foreground">
      <div className="mx-auto max-w-6xl space-y-3">
        <p>
          1. Bands are estimates from an automated system and can differ from an official IELTS result. The margin shows how far
          they may differ.
        </p>
        <p>2. IELTS is a registered trademark of its owners. BandCraft AI is independent and not affiliated with them.</p>
        <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-3">
          <span>BandCraft AI · Astana</span>
          <Link href="/design" className="hover:text-foreground">
            Design system
          </Link>
        </div>
      </div>
    </footer>
  );
}
