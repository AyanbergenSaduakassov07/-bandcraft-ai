import { BandGauge } from "@/components/score/band-gauge";

function EvidenceArt() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-8 text-left text-sm">
      <p className="text-muted-foreground">…students <mark className="rounded bg-emerald-100 px-1 text-foreground underline decoration-emerald-500 decoration-2 underline-offset-4">do a job</mark> after they graduate.</p>
      <div className="ml-10 h-8 w-px bg-border" />
      <p className="ml-4 w-fit rounded-xl bg-card px-3 py-2 text-foreground shadow-soft ring-1 ring-border">Lexical Resource · <b>6</b></p>
    </div>
  );
}

function CriteriaArt() {
  const crit = [["TR", 7], ["CC", 6], ["LR", 6], ["GRA", 7]] as const;
  return (
    <div className="grid h-full grid-cols-2 place-items-center gap-2 p-6">
      {crit.map(([k, band]) => (
        <div key={k} className="flex items-center gap-3">
          <BandGauge band={band} className="size-16" />
          <span className="text-sm font-semibold leading-tight text-foreground">{k}</span>
        </div>
      ))}
    </div>
  );
}

const FEATURES = [
  { title: "Proof, not opinions", body: "Every band quotes the sentences that earned it, so you know what to keep and what to fix. If a quote isn't in your essay, it doesn't count.", art: <EvidenceArt /> },
  { title: "Four bands, not one", body: "Task Response, Coherence, Vocabulary and Grammar are scored separately, the way examiners mark. See which one is dragging your overall band down.", art: <CriteriaArt /> },
];

/** Feature row: image-first cards, short headings, short copy. */
export function Features() {
  return (
    <section id="how" className="scroll-mt-24 bg-muted/60 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="max-w-2xl text-4xl font-bold tracking-[-0.035em] sm:text-5xl">Feedback you can act on.</h2>
      </div>
      <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-2">
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
