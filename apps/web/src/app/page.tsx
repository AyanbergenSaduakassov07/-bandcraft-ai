import { CriteriaCube } from "@/components/landing/criteria-cube";
import { Demo } from "@/components/landing/demo";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { FinalCta } from "@/components/landing/final-cta";
import { Hero } from "@/components/landing/hero";
import { Highlights } from "@/components/landing/highlights";
import { Nav } from "@/components/landing/nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { Statement } from "@/components/landing/statement";
import { TaskCompare } from "@/components/landing/task-compare";
import { ScrollReveals } from "@/components/motion/scroll-reveals";

/** The landing page, top to bottom. Each section lives in components/landing/<name>.tsx. */
export default function Home() {
  return (
    <>
      <Nav />
      <main id="top" className="overflow-x-clip">
        <Hero />
        <Demo />
        <ScrollReveals>
          <Features />
        </ScrollReveals>
        <section className="px-4 py-32 text-center sm:py-44">
          <Statement>Most checkers hand you one confident number. BandCraft AI hands you the evidence, the band, and how sure it is.</Statement>
        </section>
        <div id="criteria" className="scroll-mt-24 bg-muted/60">
          <CriteriaCube />
        </div>
        <Highlights />
        <ScrollReveals>
          <TaskCompare />
        </ScrollReveals>
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
