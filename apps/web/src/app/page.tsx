import { Compare, Faq, FinalCta, SiteFooter, Specs } from "@/components/landing/closing";
import { Demo } from "@/components/landing/demo";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import { CriteriaCube, Highlights, ScrollReveals, Statement } from "@/components/landing/scroll-pieces";

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
          <Statement>A band score without a margin is a guess. BandCraft AI shows its evidence, its band, and how sure it is.</Statement>
        </section>
        <div id="criteria" className="scroll-mt-24 bg-muted/60">
          <CriteriaCube />
        </div>
        <Highlights />
        <Specs />
        <ScrollReveals>
          <Compare />
        </ScrollReveals>
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
