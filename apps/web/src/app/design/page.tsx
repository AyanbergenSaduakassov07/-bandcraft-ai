import type { Metadata } from "next";
import { Flame, Info, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Hero } from "./hero";
import { CriteriaCube, FeedbackGallery, ScrollReveals, Statement } from "./scroll-pieces";
import { SAMPLE_RESULT, ScoreCard } from "./score-card";

export const metadata: Metadata = { title: "Design system · BandCraft AI" };

const SWATCHES = [
  ["bg", "bg-background"],
  ["surface", "bg-card"],
  ["primary", "bg-primary"],
  ["brand-500", "bg-brand-500"],
  ["brand-300", "bg-brand-300"],
  ["cyan", "bg-brand-cyan"],
  ["ink", "bg-foreground"],
  ["ink-2", "bg-muted-foreground"],
  ["danger", "bg-destructive"],
  ["success", "bg-success"],
] as const;

const TYPE_SCALE = [
  ["Numeral 48", "font-display text-5xl font-bold tabular-nums", "7.0 ± 0.5"],
  ["Display 56", "text-[3.5rem] leading-none font-bold tracking-[-0.035em]", "Write better."],
  ["Title 32", "text-[2rem] font-bold tracking-[-0.022em]", "Task Response"],
  ["Heading 24", "text-2xl font-semibold tracking-[-0.015em]", "Coherence and Cohesion"],
  ["Headline 20", "text-xl font-semibold", "Lexical Resource"],
  ["Body 16", "text-base", "Your position is clear and sustained throughout the essay."],
  ["Callout 14", "text-sm text-muted-foreground", "Қазақша · Русский · English"],
  ["Caption 12", "text-xs font-medium text-muted-foreground", "Criterion band"],
] as const;

// 12 weeks x 7 days, deterministic sample data, levels 0-4.
const HEATMAP = Array.from({ length: 84 }, (_, i) => ((i * 37) % 11) % 5);
const HEAT_CLASS = ["bg-muted", "bg-brand-300/40", "bg-brand-300", "bg-brand-500", "bg-primary"];

/** Line, not bars: bands move in half-steps, and a bar axis can't be truncated honestly. */
function BandTrend({ bands }: { bands: number[] }) {
  const [lo, hi] = [5, 7];
  const pts = bands.map((b, i) => `${(i / (bands.length - 1)) * 100},${((hi - b) / (hi - lo)) * 40}`);
  return (
    <div data-anim="trend" className="flex gap-2 text-xs text-muted-foreground">
      <div className="flex flex-col justify-between py-0.5" aria-hidden>
        <span>{hi}</span>
        <span>{lo}</span>
      </div>
      <svg viewBox="-2 -2 104 44" className="aspect-[104/44] w-full min-w-0 flex-1 overflow-visible" role="img" aria-label={`Overall band over the last ${bands.length} essays: ${bands.join(", ")}`}>
        <polyline points={pts.join(" ")} fill="none" stroke="var(--brand-500)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pts.map((p) => {
          const [x, y] = p.split(",");
          return <circle key={p} cx={x} cy={y} r="2" fill="var(--card)" stroke="var(--brand-500)" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
    </div>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16 space-y-4">
      <h2 className="text-xl font-semibold tracking-[-0.015em]">{title}</h2>
      {children}
    </section>
  );
}

function Showcase({ theme }: { theme: "light" | "dark" }) {
  const id = (s: string) => `${theme}-${s}`;
  return (
    <div className="space-y-12">
      <Section title="Score card">
        <ScoreCard result={SAMPLE_RESULT} className="bg-card ring-1 ring-border" />
      </Section>

      <Section title="Color" id={theme === "light" ? "color" : undefined}>
        <div data-anim="swatches" className="grid grid-cols-5 gap-3">
          {SWATCHES.map(([name, cls]) => (
            <div key={name} className="space-y-1">
              <div className={`${cls} h-12 rounded-lg ring-1 ring-border`} />
              <div className="text-xs text-muted-foreground">{name}</div>
            </div>
          ))}
        </div>
        <div className="bg-brand-gradient h-3 rounded-full" aria-hidden />
        <p className="text-sm text-muted-foreground">The logo gradient. Reserved for the brand mark and the streak flame.</p>
      </Section>

      <Section title="Type: Onest, numerals in Unbounded" id={theme === "light" ? "type" : undefined}>
        <div className="space-y-3">
          {TYPE_SCALE.map(([label, cls, sample]) => (
            <div key={label} className="flex items-baseline gap-4">
              <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
              <span className={cls}>{sample}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Score my essay</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="outline">Compare</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="link">View descriptors</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">Start practice</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Scoring…</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="What is the margin?">
                <Info />
              </Button>
            </TooltipTrigger>
            <TooltipContent>The true band lies within ± this value</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section title="Form">
        <div className="space-y-2">
          <Label htmlFor={id("prompt")}>Task prompt</Label>
          <Input id={id("prompt")} placeholder="Paste the question you answered" />
          <p className="text-sm text-muted-foreground">Used to judge Task Response.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("script")}>Your essay</Label>
          <Textarea id={id("script")} aria-invalid aria-describedby={id("script-err")} defaultValue="Nowadays many people think..." />
          <p id={id("script-err")} role="alert" className="text-sm text-destructive">
            4 words. Task 2 needs at least 250 words.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Switch id={id("reminders")} defaultChecked />
          <Label htmlFor={id("reminders")}>Daily practice reminder</Label>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Band 7 ± 0.5</Badge>
          <Badge variant="secondary">Task 2</Badge>
          <Badge variant="outline">Academic</Badge>
          <Badge variant="destructive">Under word floor</Badge>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="feedback">
          <TabsList>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="script">Script</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="feedback" className="pt-2 text-sm text-muted-foreground">
            Criterion-by-criterion guidance, tied to passages.
          </TabsContent>
          <TabsContent value="script" className="pt-2 text-sm text-muted-foreground">
            The Script with highlighted evidence.
          </TabsContent>
          <TabsContent value="history" className="pt-2 text-sm text-muted-foreground">
            Past Band Estimates.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Card and progress">
        <Card>
          <CardHeader>
            <CardTitle>Weekly goal</CardTitle>
            <CardDescription>3 of 5 essays scored</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={60} aria-label="Weekly goal progress" />
          </CardContent>
          <CardFooter className="justify-between">
            <span className="text-sm text-muted-foreground">Resets Monday</span>
            <Button size="sm">Write one now</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Dashboard widgets">
        <BentoGrid className="md:auto-rows-auto md:grid-cols-2">
          <BentoGridItem
            icon={<Flame className="size-5 text-brand-500" />}
            title={
              <span>
                <NumberTicker value={12} className="font-display" />-day streak
              </span>
            }
            description="Write once a day to keep it."
            header={
              <div
                data-anim="heatmap"
                className="grid grid-flow-col grid-rows-7 gap-1"
                role="img"
                aria-label="Practice heatmap for the last 12 weeks"
              >
                {HEATMAP.map((level, i) => (
                  <div key={i} className={`${HEAT_CLASS[level]} aspect-square rounded-[3px]`} />
                ))}
              </div>
            }
          />
          <BentoGridItem
            icon={<TrendingUp className="size-5 text-brand-500" />}
            title="Band trend"
            description="Up half a band over your last 8 essays"
            header={<BandTrend bands={[5.5, 6, 6, 5.5, 6, 6.5, 6, 6.5]} />}
          />
        </BentoGrid>
      </Section>
    </div>
  );
}

const NAV = [
  ["Overview", "#top"],
  ["Criteria", "#criteria"],
  ["Components", "#components"],
  ["Motion", "#motion"],
] as const;

const HIGHLIGHTS = [
  { n: 4, label: "official criteria, each scored on its own", tile: "md:col-span-2 bg-card" },
  { n: 9, label: "is the top band. Scores run from 0 in half steps.", tile: "dark bg-background text-foreground" },
  { n: 6, label: "pipeline stages between your essay and your band", tile: "dark bg-background text-foreground" },
  { n: 1, label: "margin of error on every band we show. No exceptions.", tile: "md:col-span-2 bg-card" },
] as const;

function Highlights() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <h2 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Get the highlights.</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {HIGHLIGHTS.map((h) => (
          <div key={h.label} className={`flex min-h-64 flex-col justify-between rounded-[1.75rem] p-8 ring-1 ring-border ${h.tile}`}>
            <NumberTicker value={h.n} className="text-brand-gradient font-display text-8xl leading-none font-bold" />
            <p className="max-w-xs text-xl font-semibold tracking-[-0.015em]">{h.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      <nav className="surface-glass sticky top-0 z-40 border-x-0 border-t-0">
        <div className="mx-auto flex h-13 max-w-6xl items-center justify-between gap-4 px-4">
          <a href="#top" className="text-lg font-semibold tracking-[-0.015em]">BandCraft AI</a>
          <div className="flex items-center gap-6 text-xs">
            <ul className="flex gap-6 text-muted-foreground max-md:hidden">
              {NAV.map(([label, href]) => (
                <li key={href}>
                  <a href={href} className="transition-colors duration-150 hover:text-foreground">{label}</a>
                </li>
              ))}
            </ul>
            <a href="#top" className="rounded-full bg-brand-500 px-3 py-1 font-medium text-white hover:bg-brand-700 transition-colors duration-150">
              Try it
            </a>
          </div>
        </div>
      </nav>
      <main id="top" className="min-h-dvh overflow-x-clip">
        <Hero />
        <section className="px-4 py-32 text-center sm:py-48">
          <Statement>
            A band score without a margin is a guess. BandCraft AI shows you both, for every criterion, every time.
          </Statement>
        </section>
        <Highlights />
        <div id="criteria" className="scroll-mt-12">
          <CriteriaCube />
        </div>
        <section className="py-24">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Feedback you can act on.</h2>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Every note points at a passage in your essay and says what would move the band.
            </p>
          </div>
          <div className="mt-10">
            <FeedbackGallery />
          </div>
        </section>
        <div id="components" className="grid scroll-mt-12 lg:grid-cols-2">
          <div className="bg-background px-4 py-16 text-foreground sm:px-10">
            <p className="mb-10 text-sm font-medium text-muted-foreground">Light</p>
            <ScrollReveals>
              <Showcase theme="light" />
            </ScrollReveals>
          </div>
          <div className="dark bg-background px-4 py-16 text-foreground sm:px-10">
            <p className="mb-10 text-sm font-medium text-muted-foreground">Dark</p>
            <ScrollReveals>
              <Showcase theme="dark" />
            </ScrollReveals>
          </div>
        </div>
        <section id="motion" className="mx-auto max-w-3xl scroll-mt-12 px-4 py-24">
          <h2 className="text-[2rem] font-bold tracking-[-0.022em]">Motion</h2>
          <dl className="mt-8 grid gap-6 sm:grid-cols-2">
            {MOTION.map(([term, detail]) => (
              <div key={term}>
                <dt className="font-semibold">{term}</dt>
                <dd className="mt-1 text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <footer className="bg-muted/60 px-4 py-10 text-xs leading-relaxed text-muted-foreground">
        <div className="mx-auto max-w-6xl space-y-3">
          <p>
            1. Bands are estimates from an automated system and can differ from an official IELTS result. The margin
            shows how far they may differ.
          </p>
          <p>2. IELTS is a registered trademark of its owners. BandCraft AI is independent and not affiliated with them.</p>
          <p className="border-t border-border pt-3">BandCraft AI design system</p>
        </div>
      </footer>
    </>
  );
}

const MOTION = [
  ["150 ms", "Hover, press, toggle. The button ledge compresses on press."],
  ["200 ms", "Tab and switch changes, tilt settle."],
  ["300 ms", "Progress fill, the margin fading in after the band."],
  ["Spring 140 / 18", "Score reveal, 3D shapes arriving, swatches. The value overshoots slightly and lands."],
  ["Scroll-synced", "Statement words, the criteria cube. Tied to scroll position, eased so they never jitter."],
  ["Stagger 14–40 ms", "Heatmap cells from the centre, criterion bars in order, never all at once."],
  ["Reduced motion", "Final state immediately. No WebGL loop, no count-up, no tilt, no beam, no sticky scroll."],
] as const;
