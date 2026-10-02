import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="BandCraft AI home" className="mb-8 flex justify-center">
          <Logo />
        </Link>
        <main className="rounded-3xl bg-card p-7 shadow-soft ring-1 ring-border sm:p-8">{children}</main>
      </div>
    </div>
  );
}
