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
  const bars = [["TR", 78], ["CC", 67], ["LR", 67], ["GRA", 78]] as const;
  return (
    <div className="flex h-full items-end justify-center gap-5 px-8 pb-8">
      {bars.map(([k, h]) => (
        <div key={k} className="flex h-full w-12 flex-col items-center justify-end gap-2">
          <div className="w-full rounded-t-md bg-primary" style={{ height: `${h}%`, opacity: 0.55 + h / 250 }} />
          <span className="text-xs font-semibold text-muted-foreground">{k}</span>
        </div>
      ))}
    </div>
  );
}

function MarginArt() {
  return (
    <div className="flex h-full flex-col justify-center px-8">
      <div className="relative h-16">
        <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        <div className="absolute top-1/2 left-[61%] h-6 w-[22%] -translate-y-1/2 rounded-full bg-accent ring-1 ring-primary/30" />
        <div className="absolute top-1/2 left-[72%] size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-card" />
        {[0, 3, 6, 9].map((n) => (
          <span key={n} className="absolute top-full text-xs text-muted-foreground" style={{ left: `${(n / 9) * 100}%` }}>
            {n}
          </span>
        ))}
      </div>
      <p className="mt-8 text-center text-2xl font-bold">6.5 <span className="text-primary">± 0.5</span></p>
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
