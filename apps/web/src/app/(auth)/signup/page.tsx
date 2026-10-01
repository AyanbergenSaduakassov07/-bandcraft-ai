import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account · BandCraft AI" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
