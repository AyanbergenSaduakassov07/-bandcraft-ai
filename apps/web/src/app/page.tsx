import { FinalCta, SiteFooter, SpecStrip } from "@/components/landing/closing";
import { FeatureRows } from "@/components/landing/feature-rows";
import { Hero } from "@/components/landing/hero";
import { RevealSection } from "@/components/landing/reveal-section";
import { CriteriaCube, GetToKnow, ScrollReveals, Statement } from "@/components/landing/scroll-pieces";
import { SiteNav } from "@/components/landing/site-nav";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main id="top" className="overflow-x-clip">
        <Hero />
        <RevealSection />
        <section className="px-4 py-32 text-center sm:py-44">
          <Statement>
            A band score without a margin is a guess. BandCraft AI shows its evidence, its band, and how sure it is.
          </Statement>
        </section>
        <ScrollReveals>
          <FeatureRows />
        </ScrollReveals>
        <div id="criteria" className="scroll-mt-14">
          <CriteriaCube />
        </div>
        <GetToKnow />
        <SpecStrip />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
