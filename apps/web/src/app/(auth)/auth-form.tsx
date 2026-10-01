"use client";

import { useActionState } from "react";
import Link from "next/link";
import { LoaderCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, type FormState } from "./actions";

export function AuthForm({ mode, next, linkError }: { mode: "signup" | "login"; next?: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "signup" ? signUp : signIn, undefined);

  if (state?.sent)
    return (
      <div className="text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.022em]">Check your email</h1>
        <p className="mt-2 text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{state.sent}</span>. Open it to start writing.
        </p>
      </div>
    );

  const error = state?.error ?? (linkError ? "That link has expired or was already used. Sign in, or sign up again." : null);
  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.022em]">{mode === "signup" ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup" ? "Score your IELTS Writing and keep a history of every band." : "Pick up where you left off."}
        </p>
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.email} key={state?.email} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
      </div>
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="birth_date">Date of birth</Label>
          <Input id="birth_date" name="birth_date" type="date" min="1900-01-01" aria-describedby="age-note" required />
          <p id="age-note" className="text-xs leading-relaxed text-muted-foreground">
            BandCraft AI is for adults (18+). Our scoring runs on Google’s Gemini API, whose terms don’t allow use by anyone under 18, so we
            check your age before creating an account.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />}
        {mode === "signup" ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup" className="font-medium text-primary hover:underline">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
