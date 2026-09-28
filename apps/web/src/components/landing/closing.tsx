import Link from "next/link";
import { BarChart3, FileText, Mail } from "lucide-react";
import { HAS_DEMO, PRIMARY_CTA } from "./cta";
import { Logo } from "./logo";

const TASKS = [
  { icon: BarChart3, name: "Task 1 Academic", time: "20 minutes · at least 150 words", what: "Describe a chart, table, map or process. We check for a clear overview, the key features, and data you reported accurately." },
  { icon: Mail, name: "Task 1 General", time: "20 minutes · at least 150 words", what: "Write a letter with a purpose. We check that every bullet point is covered and your tone fits who you are writing to." },
  { icon: FileText, name: "Task 2", time: "40 minutes · at least 250 words", what: "Argue a position. We check that you answered every part of the question and backed your ideas up. It counts double, so it matters most." },
];

/** Apple's "Which one is right for you?" compare row. */
export function Compare() {
  return (
    <section id="tasks" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Which task are you writing?</h2>
        <div className="mt-16 grid gap-12 text-left sm:grid-cols-3 sm:gap-8">
          {TASKS.map((t) => (
            <div key={t.name} data-anim="pop" className="flex flex-col items-center text-center">
              <span className="grid size-16 place-items-center rounded-2xl bg-secondary text-primary">
                <t.icon className="size-8" />
              </span>
              <h3 className="mt-6 text-2xl font-bold tracking-tight">{t.name}</h3>
              <p className="mt-1 text-sm font-semibold text-primary">{t.time}</p>
              <p className="mt-4 text-muted-foreground">{t.what}</p>
              <a href={PRIMARY_CTA.href} className="mt-6 text-primary hover:underline">
                {HAS_DEMO ? "See a scored essay" : "How we score it"} ›
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["Is this my official IELTS score?", "No, and anyone who promises that is guessing. BandCraft AI gives you an estimate against the public band descriptors, with a margin of error that tells you how far the real result might be."],
  ["What does 6.5 ± 0.5 actually mean?", "Expect somewhere from 6.0 to 7.0 on the day. When your essay gives strong evidence, the range is tight. When it doesn't, the range widens, and we say so instead of pretending."],
  ["Can it help me get from 6.5 to 7?", "It shows which of the four criteria is holding your overall band down and quotes the sentences behind it, so you know exactly what to fix first. The practice is still yours."],
  ["Which tasks can I submit?", "Task 1 Academic (charts, tables, maps and processes), Task 1 General Training (letters), and Task 2 essays. For Task 1 Academic, paste the data you were given so we can check your figures."],
  ["How is this different from other IELTS checkers?", "Other checkers give you a number. We show our working: the evidence for every band, checked against your actual text, and an honest range instead of false precision."],
  ["How accurate is it?", "We only publish accuracy measured against our labelled essay set, with the date and the model used. Until examiner-marked essays are added, you won't see a headline percentage from us."],
  ["What happens to my essay?", "It is sent to Google's Gemini model to be scored. Leave out anything personal you wouldn't want processed."],
];

/** FAQ on native <details>: keyboard and screen-reader support for free. */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.6fr]">
        <h2 className="text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Before you ask.</h2>
        <div className="divide-y divide-border border-y border-border">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                {q}
                <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-prose text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Closing call to action: centred, confident, one blue pill. */
export function FinalCta() {
  return (
    <section id="final" className="relative isolate scroll-mt-24 overflow-hidden px-4 py-32 text-center">
      <div aria-hidden className="absolute top-1/2 left-1/2 -z-10 h-[36rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgb(30_136_229/0.12),transparent)]" />
      <h2 className="mx-auto max-w-3xl text-5xl leading-[1.02] font-bold tracking-[-0.045em] sm:text-7xl">Walk into the exam knowing where you stand.</h2>
      <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
        Four criteria, the evidence behind every band, and an honest margin of error. No guesswork, no inflated scores.
      </p>
      <a href={PRIMARY_CTA.href} className="mt-10 inline-block rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgb(21_101_192/0.6)] transition-[filter] duration-150 hover:brightness-110">
        {PRIMARY_CTA.label} →
      </a>
    </section>
  );
}

const DIRECTORY = [
  ["Explore", [...(HAS_DEMO ? [["Live sample", "#demo"] as const] : []), ["How it works", "#how"], ["The four criteria", "#criteria"], ["Highlights", "#highlights"]]],
  ["Tasks", [["Task 1 Academic", "#tasks"], ["Task 1 General", "#tasks"], ["Task 2", "#tasks"]]],
  ["Project", [["FAQ", "#faq"], ["Design system", "/design"]]],
] as const;

/** Apple's footer: fine print first, then a quiet directory, then the legal line. */
export function SiteFooter() {
  return (
    <footer className="bg-muted px-4 pt-6 pb-8 text-xs leading-relaxed text-muted-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-3 border-b border-border pb-5">
          <p>1. Bands are estimates from an automated system and can differ from an official IELTS result. The margin shows how far they may differ.</p>
          <p>2. IELTS is a registered trademark of its owners. BandCraft AI is independent and not affiliated with them.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 py-6 sm:grid-cols-3">
          {DIRECTORY.map(([title, links]) => (
            <div key={title}>
              <p className="font-semibold text-foreground">{title}</p>
              <ul className="mt-2 space-y-1.5">
                {links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link href={href} className="hover:text-foreground hover:underline">{label}</Link>
                    ) : (
                      <a href={href} className="hover:text-foreground hover:underline">{label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><Logo /><span>Astana, Kazakhstan</span></div>
      </div>
    </footer>
  );
}
