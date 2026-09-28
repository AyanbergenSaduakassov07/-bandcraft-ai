import Link from "next/link";
import { CRITERIA, CRITERION_LABELS } from "@bandcraft/shared";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-[2rem] font-bold">BandCraft AI</h1>
      <p className="mt-2 text-muted-foreground">
        IELTS Writing band scores with an explicit margin of error.
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-5">
        {CRITERIA.map((c) => (
          <li key={c}>{CRITERION_LABELS[c]}</li>
        ))}
      </ul>
      <Link href="/design" className="mt-8 inline-block font-semibold text-primary underline-offset-4 hover:underline">
        Design system →
      </Link>
    </main>
  );
}
