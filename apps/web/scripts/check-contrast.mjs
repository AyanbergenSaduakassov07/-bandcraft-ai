// WCAG contrast check for the token pairs in globals.css, in both themes. Exits 1 on failure.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

function tokens(selector) {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`token block not found: ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [foreground, background, minimum ratio]. 4.5 = body text, 3 = large text / UI graphics.
const PAIRS = [
  ["foreground", "background", 4.5],
  ["card-foreground", "card", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["primary", "background", 4.5], // links
  ["primary", "card", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["destructive", "card", 4.5],
  ["success", "card", 4.5],
  ["ring", "background", 3],
  ["ring", "card", 3],
  ["chart-2", "card", 3],
];

const root = tokens(":root,\n.light");
const themes = { light: root, dark: { ...root, ...tokens(".dark") } };

let failed = 0;
for (const [theme, t] of Object.entries(themes)) {
  for (const [fg, bg, min] of PAIRS) {
    const ratio = contrast(t[fg], t[bg]);
    const ok = ratio >= min;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${theme.padEnd(5)} ${fg} on ${bg}: ${ratio.toFixed(2)} (min ${min})`);
  }
}
assertSanity();
process.exit(failed ? 1 : 0);

function assertSanity() {
  // Known WCAG values: black/white = 21, identical = 1.
  if (Math.abs(contrast("#000000", "#ffffff") - 21) > 0.01 || contrast("#1e88e5", "#1e88e5") !== 1) {
    throw new Error("contrast() is broken");
  }
}
