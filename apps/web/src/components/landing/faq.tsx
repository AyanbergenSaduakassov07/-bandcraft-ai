

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
