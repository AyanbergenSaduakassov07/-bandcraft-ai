import { BandGauge } from "@/components/ui/band-gauge";

function EvidenceArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-8 text-left text-sm">
      <p className="text-muted-foreground">…students <mark className="rounded bg-emerald-100 px-1 text-foreground underline decoration-emerald-500 decoration-2 underline-offset-4">do a job</mark> after they graduate.</p>
      <div className="ml-10 h-8 w-px bg-border" />
      <p className="ml-4 w-fit rounded-xl bg-card px-3 py-2 text-foreground shadow-soft ring-1 ring-border">Lexical Resource · <b>6 ± 0.5</b></p>
    </div>
  );
}

function CriteriaArt() {
  const crit = [["TR", 7], ["CC", 6], ["LR", 6], ["GRA", 7]] as const;
  return (
    <div className="grid h-full grid-cols-2 place-items-center gap-2 p-6">
      {crit.map(([k, band]) => (
        <div key={k} className="flex items-center gap-3">
          <BandGauge band={band} margin={0.5} className="size-16" />
          <span className="text-sm leading-tight">
            <span className="block font-semibold text-foreground">{k}</span>
            <span className="text-muted-foreground">± 0.5</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function MarginArt() {
  return (
    <div className="flex h-full items-center justify-center gap-6 px-8">
      <BandGauge band={6.5} margin={0.5} className="size-32" />
      <div className="text-left">
        <p className="text-sm text-muted-foreground">Margin of error</p>
        <p className="text-3xl font-bold tracking-tight text-primary">± 0.5</p>
        <p className="mt-1 text-sm text-muted-foreground">Likely 6.0 to 7.0</p>
      </div>
    </div>
  );
}

const FEATURES = [
  { title: "Evidence first", body: "Before any band, it quotes the exact words in your essay that earned it. Quotes it can't find in your text don't count.", art: <EvidenceArt /> },
  { title: "Four criteria", body: "Task Response, Coherence and Cohesion, Lexical Resource and Grammar are judged separately, the way examiners mark.", art: <CriteriaArt /> },
  { title: "Honest margins", body: "Every band carries a ± range. When the evidence is thin or the runs disagree, the range gets wider and says so.", art: <MarginArt /> },
];

/** Three-up feature row: image-first cards, short headings, short copy. */
export function Features() {
  return (
    <section id="how" className="scroll-mt-24 bg-muted/60 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-2xl text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Scored the way examiners think.</h2>
      </div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-3">
        {FEATURES.map((f) => (
          <article key={f.title} data-anim="pop">
            <div className="aspect-[16/11] overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-border">{f.art}</div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-2 text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
