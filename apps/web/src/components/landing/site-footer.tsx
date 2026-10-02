import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { HAS_DEMO } from "@/lib/cta";

const DIRECTORY = [
  ["Explore", [...(HAS_DEMO ? [["Live sample", "#demo"] as const] : []), ["How it works", "#how"], ["The four criteria", "#criteria"], ["Highlights", "#highlights"]]],
  ["Tasks", [["Task 1 Academic", "#tasks"], ["Task 1 General", "#tasks"], ["Task 2", "#tasks"]]],
  ["Project", [["FAQ", "#faq"], ["Design system", "/design"]]],
] as const;

/** Apple's footer: fine print first, then a quiet directory, then the legal line. */
export function SiteFooter() {
  return (
    <footer className="bg-muted px-4 pt-6 pb-8 text-xs leading-relaxed text-muted-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="space-y-3 border-b border-border pb-5">
          <p>1. Bands are estimates from an automated system and can differ from an official IELTS result.</p>
          <p>2. IELTS is a registered trademark of its owners. BandCraft AI is independent and not affiliated with them.</p>
          <p>3. BandCraft AI is for adults aged 18 and over.</p>
        </div>
        <div className="grid grid-cols-2 gap-8 py-6 sm:grid-cols-3">
          {DIRECTORY.map(([title, links]) => (
            <div key={title}>
              <p className="font-semibold text-foreground">{title}</p>
              <ul className="mt-2 space-y-1.5">
                {links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith("/") ? (
                      <Link href={href} className="hover:text-foreground hover:underline">{label}</Link>
                    ) : (
                      <a href={href} className="hover:text-foreground hover:underline">{label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><Logo /><span>Astana, Kazakhstan</span></div>
      </div>
    </footer>
  );
}
