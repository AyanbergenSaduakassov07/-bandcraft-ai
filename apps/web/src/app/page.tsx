import { CRITERIA, CRITERION_LABELS } from "@bandcraft/shared";

export default function Home() {
  return (
    <main>
      <h1>BandCraft AI</h1>
      <p>IELTS Writing band scores with an explicit margin of error.</p>
      <ul>
        {CRITERIA.map((c) => (
          <li key={c}>{CRITERION_LABELS[c]}</li>
        ))}
      </ul>
    </main>
  );
}
