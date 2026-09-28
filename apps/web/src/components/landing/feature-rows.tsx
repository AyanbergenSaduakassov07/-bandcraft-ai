import { BarChart3, Check, Crown, FileText, Flame, Lock, Mail, Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Keycap tiles (Duolingo's floating letter tiles), relabelled with the rubric.
const KEYS = [
  { label: "TR", sub: "Task Response", cls: "bg-brand-500 [--ledge:#0d47a1]", pos: "left-[6%] top-[12%] rotate-[-10deg]", delay: "0s" },
  { label: "CC", sub: "Coherence", cls: "bg-brand-cyan text-[#0b1f33] [--ledge:#0288d1]", pos: "left-[40%] top-[2%] rotate-[8deg]", delay: "-1.2s" },
  { label: "LR", sub: "Lexical", cls: "bg-brand-700 [--ledge:#08306b]", pos: "right-[6%] top-[18%] rotate-[12deg]", delay: "-2.4s" },
  { label: "GRA", sub: "Grammar", cls: "bg-brand-300 text-[#0b1f33] [--ledge:#1e88e5]", pos: "left-[18%] bottom-[10%] rotate-[6deg]", delay: "-3.1s" },
  { label: "±", sub: "Margin", cls: "bg-foreground [--ledge:#000]", pos: "right-[14%] bottom-[6%] rotate-[-8deg]", delay: "-0.6s" },
  { label: "¶", sub: "Paragraphs", cls: "bg-card text-primary! [--ledge:var(--border)] ring-2 ring-border", pos: "left-[46%] top-[44%] rotate-[-4deg]", delay: "-1.8s" },
];

function Keycaps() {
  return (
    <div data-anim="pop" className="relative aspect-[5/4] w-full" aria-hidden>
      {KEYS.map((k) => (
        <div
          key={k.label}
          className={cn("absolute animate-[float_6s_ease-in-out_infinite]", k.pos)}
          style={{ animationDelay: k.delay }}
        >
          <div className={cn("grid size-24 place-items-center rounded-3xl text-white shadow-[0_8px_0_var(--ledge)] sm:size-28", k.cls)}>
            <div className="text-center">
              <div className="font-display text-4xl leading-none font-black">{k.label}</div>
              <div className="mt-1 text-[0.65rem] font-bold tracking-wider uppercase opacity-80">{k.sub}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnnotatedEssay() {
  return (
    <div data-anim="pop" className="mx-auto w-full max-w-md" aria-label="Example of criterion feedback on an essay">
      <div className="rounded-3xl bg-card p-7 pb-20 text-[0.95rem] leading-8 shadow-float ring-1 ring-border">
        <p className="text-xs font-extrabold tracking-wider text-muted-foreground uppercase">Task 2 · Paragraph 2</p>
        <p className="mt-2">
          Firstly, universities should prepare students for work.{" "}
          <mark className="rounded bg-destructive/12 px-0.5 text-foreground underline decoration-destructive decoration-wavy underline-offset-4">
            Furthermore
          </mark>
          , employers want skills.{" "}
          <mark className="rounded bg-destructive/12 px-0.5 text-foreground underline decoration-destructive decoration-wavy underline-offset-4">
            Furthermore
          </mark>
          , students{" "}
          <mark className="rounded bg-brand-cyan/15 px-0.5 text-foreground underline decoration-brand-cyan decoration-wavy underline-offset-4">
            do a job
          </mark>{" "}
          after they graduate.
        </p>
      </div>
      <div className="-mt-12 flex flex-wrap items-start justify-center gap-4 px-2">
        <div className="w-[13rem] -rotate-2 rounded-2xl bg-card p-4 text-sm shadow-float ring-2 ring-brand-cyan">
          <p className="font-extrabold text-primary">Lexical · 6 ± 0.5</p>
          <p className="mt-1 text-muted-foreground">“do a job” is vague. Try “pursue a career”.</p>
        </div>
        <div className="w-[13rem] rotate-2 rounded-2xl bg-primary p-4 text-sm text-primary-foreground shadow-[0_6px_0_var(--edge)]">
          <p className="font-extrabold">Coherence · 6 ± 0.5</p>
          <p className="mt-1 opacity-90">Same linker twice. Let the second idea follow on: “Employers, in turn, …”</p>
        </div>
      </div>
    </div>
  );
}

const PATH = [
  { icon: BarChart3, label: "Line graphs", state: "done" },
  { icon: Mail, label: "Formal letters", state: "done" },
  { icon: FileText, label: "Opinion essays", state: "current" },
  { icon: Star, label: "Linking words", state: "locked" },
  { icon: Crown, label: "Mock test", state: "locked" },
] as const;
const OFFSETS = ["translate-x-0", "translate-x-12", "translate-x-16", "translate-x-8", "-translate-x-6"];

function LessonPath() {
  return (
    <div data-anim="pop" className="mx-auto flex w-full max-w-md items-center justify-between gap-6">
      <ol className="flex flex-col items-center gap-11 pt-10" aria-label="Practice path">
        {PATH.map((n, i) => (
          <li key={n.label} className={cn("relative", OFFSETS[i])}>
            {n.state === "current" && (
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce rounded-xl bg-card px-3 py-1 text-xs font-extrabold tracking-wider text-primary uppercase shadow-soft ring-2 ring-border motion-reduce:animate-none">
                Start
              </span>
            )}
            <span
              title={n.label}
              className={cn(
                "grid size-16 place-items-center rounded-full",
                n.state === "done" && "bg-brand-500 text-white shadow-[0_6px_0_var(--brand-700)]",
                n.state === "current" && "bg-primary text-primary-foreground shadow-[0_6px_0_var(--edge)] ring-8 ring-brand-300/35",
                n.state === "locked" && "bg-muted text-muted-foreground shadow-[0_6px_0_var(--border)]",
              )}
            >
              {n.state === "done" ? <Check className="size-7" strokeWidth={3} /> : n.state === "locked" ? <Lock className="size-6" /> : <n.icon className="size-7" />}
            </span>
            <span className="sr-only">
              {n.label}: {n.state}
            </span>
          </li>
        ))}
      </ol>
      <div className="w-44 space-y-4">
        <div className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border">
          <div className="flex items-center gap-2 font-display text-3xl font-black text-brand-500">
            <Flame className="size-7 fill-brand-cyan text-brand-500" /> 12
          </div>
          <p className="text-sm font-bold text-muted-foreground">day streak</p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {"MTWTFSS".split("").map((d, i) => (
              <span key={i} className={cn("grid size-5 place-items-center rounded-full text-[0.6rem] font-black", i < 5 ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground")}>
                {d}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-soft ring-1 ring-border">
          <p className="text-sm font-bold text-muted-foreground">Target band</p>
          <p className="font-display text-3xl font-black text-foreground">7.0</p>
          <div className="mt-2 h-3 rounded-full bg-muted">
            <div className="h-full w-[78%] rounded-full bg-brand-500" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Now 6.5 ± 0.5</p>
        </div>
      </div>
    </div>
  );
}

const ROWS = [
  {
    id: "criteria-intro",
    title: "scored like an examiner",
    body: "Task Response, Coherence, Lexical Resource and Grammar are each judged on their own, against the public band descriptors. No single vague number.",
    art: <Keycaps />,
  },
  {
    id: "feedback",
    title: "feedback you can act on",
    body: "Every note points at the exact words in your essay and tells you what would move that criterion up a band.",
    art: <AnnotatedEssay />,
  },
  {
    id: "practice",
    title: "practice that sticks",
    body: "Short daily drills for the skills that cost you marks, a streak to keep you honest, and a target band you can see getting closer.",
    art: <LessonPath />,
  },
];

/** Duolingo's alternating feature rows: heavy lowercase headline in brand colour, art on the other side. */
export function FeatureRows() {
  return (
    <div className="mx-auto max-w-6xl space-y-28 px-4 py-28 sm:space-y-40">
      {ROWS.map((row, i) => (
        <section key={row.id} id={row.id === "practice" ? "practice" : undefined} className="grid scroll-mt-20 items-center gap-12 md:grid-cols-2">
          <div className={cn(i % 2 && "md:order-2")}>
            <h2 className="text-5xl leading-none font-black text-primary sm:text-6xl">{row.title}</h2>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">{row.body}</p>
          </div>
          <div className={cn(i % 2 && "md:order-1")}>{row.art}</div>
        </section>
      ))}
    </div>
  );
}
