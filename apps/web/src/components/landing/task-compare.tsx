import { BarChart3, FileText, Mail } from "lucide-react";
import { HAS_DEMO, PRIMARY_CTA } from "@/lib/cta";

const TASKS = [
  { icon: BarChart3, name: "Task 1 Academic", time: "20 minutes · at least 150 words", what: "Describe a chart, table, map or process. We check for a clear overview, the key features, and data you reported accurately." },
  { icon: Mail, name: "Task 1 General", time: "20 minutes · at least 150 words", what: "Write a letter with a purpose. We check that every bullet point is covered and your tone fits who you are writing to." },
  { icon: FileText, name: "Task 2", time: "40 minutes · at least 250 words", what: "Argue a position. We check that you answered every part of the question and backed your ideas up. It counts double, so it matters most." },
];

/** Apple's "Which one is right for you?" compare row. */
export function TaskCompare() {
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
