// Run: npm test (node --test strips the types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { segments, spans, wordCount, type Evidence } from "./evidence.ts";
import { currentStreak, dayKey, heatmap } from "./streak.ts";
import { isAdult } from "./age.ts";

const ev = (quote: string, start: number | null, verified = true): Evidence => ({
  quote,
  observation: "",
  start,
  end: start === null ? null : start + quote.length,
  verified,
});

test("spans: bad offsets fall back to search, unverified are dropped, overlaps keep the first", () => {
  const script = "😀 Cities grow fast. Prices rise too.";
  const all = spans(script, {
    // Python offset (code points) is 1 short of the UTF-16 one because of the emoji.
    lexical_resource: { evidence: [ev("grow fast", 9), ev("not in text", 0), ev("Prices", 0, false)] },
    coherence_cohesion: { evidence: [ev("Cities grow", 3)] },
  });
  assert.deepEqual(all.map((s) => [s.id, script.slice(s.start, s.end)]), [
    ["coherence_cohesion-0", "Cities grow"],
    ["lexical_resource-0", "grow fast"],
  ]);
  const segs = segments(script, all);
  assert.equal(segs.map((s) => s.text).join(""), script);
  assert.deepEqual(segs.filter((s) => s.span).map((s) => s.span!.id), ["coherence_cohesion-0"]);
});

test("wordCount", () => {
  assert.equal(wordCount("  Well-known  facts,\nreally.  "), 3);
  assert.equal(wordCount(""), 0);
});

test("streak survives until today ends, breaks on a gap", () => {
  const today = new Date(2026, 9, 1);
  const d = (n: number) => dayKey(new Date(2026, 9, 1 + n));
  assert.equal(currentStreak(new Set([d(0), d(-1), d(-2), d(-4)]), today), 3);
  assert.equal(currentStreak(new Set([d(-1), d(-2)]), today), 2);
  assert.equal(currentStreak(new Set([d(-2)]), today), 0);
});

test("heatmap ends on today's column with future days blank", () => {
  const today = new Date(2026, 9, 1); // a Thursday
  const cells = heatmap(new Map([[dayKey(today), 2]]), 2, today);
  assert.equal(cells.length, 14);
  assert.deepEqual(cells.slice(7), [0, 0, 0, 2, null, null, null]);
});

test("isAdult: 18 on the birthday, not the day before; junk is rejected", () => {
  const today = new Date(Date.UTC(2026, 9, 1));
  assert.equal(isAdult("2008-10-01", today), true);
  assert.equal(isAdult("2008-10-02", today), false);
  assert.equal(isAdult("1990-01-01", today), true);
  assert.equal(isAdult("2008-02-30", today), false);
  assert.equal(isAdult("", today), false);
  assert.equal(isAdult("1899-12-31", today), false);
  // A 29 February birthday turns 18 on 1 March in non-leap years.
  assert.equal(isAdult("2008-02-29", new Date(Date.UTC(2026, 1, 28))), false);
  assert.equal(isAdult("2008-02-29", new Date(Date.UTC(2026, 2, 1))), true);
});
