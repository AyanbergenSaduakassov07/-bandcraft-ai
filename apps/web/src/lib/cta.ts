import results from "@/content/demo-results.json";

/** The live sample only renders once real engine output is recorded; every CTA follows that. */
export const HAS_DEMO = results.essays.length > 0;

export const PRIMARY_CTA = HAS_DEMO
  ? { href: "#demo", label: "Watch it score an essay", short: "Watch it score" }
  : { href: "#how", label: "See how it works", short: "See how it works" };
