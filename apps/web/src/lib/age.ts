// The 18+ gate. Gemini API Additional Terms (https://ai.google.dev/gemini-api/terms), "Age Requirements":
// "You must be 18 years of age or older to use the APIs." The database enforces the same rule
// (private.handle_new_user); this copy only gives a clear message before the request is sent.

export const MIN_AGE = 18;

/** True when someone born on `birthDate` (YYYY-MM-DD) is at least 18 on `today`. Invalid dates are false. */
export function isAdult(birthDate: string, today = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const born = new Date(Date.UTC(y, mo - 1, d));
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== mo - 1 || born.getUTCDate() !== d || y < 1900) return false;
  // Compare in UTC, as the database does (current_date on a UTC server).
  const ty = today.getUTCFullYear();
  const birthdayPassed = today.getUTCMonth() > mo - 1 || (today.getUTCMonth() === mo - 1 && today.getUTCDate() >= d);
  return ty - y - (birthdayPassed ? 0 : 1) >= MIN_AGE;
}
