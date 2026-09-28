import Link from "next/link";
import { BarChart3, FileText, Mail } from "lucide-react";
import { Logo } from "./logo";

const SPECS = [
  ["Tasks", "Task 1 Academic (reports on charts, tables, maps, processes) · Task 1 General Training (letters) · Task 2 (essays)"],
  ["Criteria", "Task Achievement or Task Response · Coherence and Cohesion · Lexical Resource · Grammatical Range and Accuracy"],
  ["Output", "Overall band in half steps and four criterion bands, each with its margin of error"],
  ["Evidence", "Verbatim quotes from your script, located by position; unverifiable quotes are flagged"],
  ["Checks", "Word count against the minimum, paragraphing, spelling, agreement and article errors, linking-word overuse"],
  ["Scoring model", "Gemini, prompted to cite evidence before it gives a band"],
  ["Interface", "English; Kazakh and Russian planned"],
];

/** Apple-style tech specs: label and value rows split by hairlines. */
export function Specs() {
  return (
    <section id="specs" className="scroll-mt-24 bg-muted/60 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Tech specs</h2>
        <dl className="mt-10 border-t border-border">
          {SPECS.map(([k, v]) => (
            <div key={k} className="grid gap-2 border-b border-border py-6 sm:grid-cols-[14rem_1fr]">
              <dt className="font-semibold">{k}</dt>
              <dd className="text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

const TASKS = [
  { icon: BarChart3, name: "Task 1 Academic", time: "20 minutes · at least 150 words", what: "Describe a chart, table, map or process. Scored on Task Achievement: an overview and the key features, with accurate data." },
  { icon: Mail, name: "Task 1 General", time: "20 minutes · at least 150 words", what: "Write a letter for a purpose. Scored on Task Achievement: every bullet point covered, in the right tone." },
  { icon: FileText, name: "Task 2", time: "40 minutes · at least 250 words", what: "Argue a position. Scored on Task Response: every part of the question answered, with ideas developed and supported. Counts double." },
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
              <a href="#demo" className="mt-6 text-primary hover:underline">
                See a scored sample ›
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["Is this an official IELTS score?", "No. BandCraft AI gives an automated estimate against the public band descriptors. It can differ from an examiner's band, which is exactly why every band comes with its margin of error."],
  ["What does the margin of error mean?", "The range the examiner's band is likely to fall in. 6.5 ± 0.5 means we expect a 6.0, 6.5 or 7.0. It widens when the evidence in your essay is thin or our scoring runs disagree."],
  ["Which tasks can I submit?", "Task 1 Academic (charts, tables, maps, processes), Task 1 General Training (letters) and Task 2 essays. Task 1 Academic works best when you paste the data you were given."],
  ["How is it different from other IELTS checkers?", "It shows its working. Every band quotes the passages that earned it, checks those quotes against your text, and tells you how sure it is instead of printing one confident number."],
  ["How accurate is it?", "We publish accuracy only against our gold set of labelled essays, with the model, prompt version and date. Until examiner-scored scripts are added, we don't quote a percentage."],
  ["What happens to my essays?", "Your essay is sent to Google's Gemini model to be marked. Don't include personal details you wouldn't want processed."],
];

/** FAQ on native <details>: keyboard and screen-reader support for free. */
export function Faq() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.6fr]">
        <h2 className="text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Questions, answered.</h2>
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
      <h2 className="mx-auto max-w-3xl text-5xl leading-[1.02] font-bold tracking-[-0.045em] sm:text-7xl">Write. Get scored. Improve.</h2>
      <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl">
        Task 1 or Task 2: a band for each criterion, the evidence behind it, and how sure we are.
      </p>
      <a href="#demo" className="mt-10 inline-block rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgb(21_101_192/0.6)] transition-[filter] duration-150 hover:brightness-110">
        See it score an essay →
      </a>
    </section>
  );
}

const DIRECTORY = [
  ["Explore", [["Live sample", "#demo"], ["How it scores", "#how"], ["The four criteria", "#criteria"], ["Highlights", "#highlights"], ["Tech specs", "#specs"]]],
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
