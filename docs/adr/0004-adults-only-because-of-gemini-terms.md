# Accounts are 18+ only, enforced in the database

Follows from [ADR-0001](0001-gemini-free-tier-only.md). The [Gemini API Additional Terms of Service](https://ai.google.dev/gemini-api/terms) say, under "Age Requirements": "You must be 18 years of age or older to use the APIs", and API clients must not be "directed towards or ... likely to be accessed by individuals under the age of 18." Many IELTS candidates are 16 or 17, so this rule costs real users. We accept that rather than break the terms our scoring depends on.

**Decision:** every account records a date of birth at signup, and anyone under 18 is refused. The check lives in Postgres: the `on_auth_user_created` trigger (`private.handle_new_user`) rejects any new auth user without an adult `birth_date` in its signup metadata, so the form, a direct API call and any future sign-in method all hit the same gate. `profiles.birth_date` is the record that the check passed, and users can't edit it. The signup form repeats the check only to show a clear message. Scoring (`/api/score`) requires a signed-in account with a profile.

**Not covered by this:** a self-declared date of birth can be falsified, and that's the standard the terms rely on, not identity verification. "Likely to be accessed by" minors also covers marketing: the landing page and any outreach must not target school students. Adding OAuth sign-in requires collecting a date of birth before the account exists, or the trigger will refuse it.

Revisit if scoring moves to a model whose terms allow minors, with appropriate parental-consent handling.
