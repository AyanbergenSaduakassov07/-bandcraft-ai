"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdult } from "@/lib/age";
import { createClient } from "@/lib/supabase";

export type FormState = { error?: string; sent?: string; email?: string } | undefined;

/** Only same-site paths, so ?next= can't bounce a user to another domain after login. */
const safeNext = (next: FormDataEntryValue | null) =>
  typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/write";

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const birthDate = String(form.get("birth_date") ?? "");
  if (!email || password.length < 8) return { email, error: "Enter your email and a password of at least 8 characters." };
  // Checked here for a clear message; the database trigger refuses the account regardless.
  if (!isAdult(birthDate)) return { email, error: "BandCraft AI is only for people aged 18 and over, so we can’t create an account for you." };

  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { birth_date: birthDate }, emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    console.error("signup failed", error.code, error.message);
    const message =
      error.code === "weak_password" ? error.message
      : error.code === "email_address_invalid" ? "That email address can’t receive mail. Use a real address."
      : "We couldn’t create your account. Check your details and try again.";
    return { email, error: message };
  }
  return { sent: email };
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: String(form.get("password") ?? "") });
  if (error) return { email, error: error.code === "email_not_confirmed" ? "Confirm your email first: we sent you a link." : "Wrong email or password." };
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
