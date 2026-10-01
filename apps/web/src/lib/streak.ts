// Practice cadence only. Takes the days a student scored a Script, never the bands they got.

/** Local calendar day, YYYY-MM-DD. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const shift = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/** Consecutive practice days ending today, or yesterday (the streak survives until today is over). */
export function currentStreak(days: Set<string>, today = new Date()): number {
  let d = days.has(dayKey(today)) ? today : shift(today, -1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d = shift(d, -1);
  }
  return n;
}

/** Last `weeks` weeks as columns of 7 days (Mon→Sun), oldest first; days after today are null. */
export function heatmap(days: Map<string, number>, weeks = 12, today = new Date()): (number | null)[] {
  const monday = shift(today, -((today.getDay() + 6) % 7));
  const start = shift(monday, -7 * (weeks - 1));
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = shift(start, i);
    return d > today ? null : (days.get(dayKey(d)) ?? 0);
  });
}
