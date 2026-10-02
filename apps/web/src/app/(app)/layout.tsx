import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { signOut } from "../(auth)/actions";

/** The signed-in app. The middleware has already sent signed-out visitors to /login. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted">
      <header className="surface-glass sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" aria-label="BandCraft AI home">
            <Logo />
          </Link>
          <nav aria-label="App" className="flex gap-5 text-sm font-medium text-muted-foreground">
            <Link href="/write" className="hover:text-foreground">Write</Link>
            <Link href="/speak" className="hover:text-foreground">Speak</Link>
            <Link href="/history" className="hover:text-foreground">History</Link>
          </nav>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="min-h-11 text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
