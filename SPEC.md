# Scoring Pipeline Spec

Terms are defined in [CONTEXT.md](CONTEXT.md). Constraints: Gemini API free tier for every model call ([ADR-0001](docs/adr/0001-gemini-free-tier-only.md)), Kaggle for all fine-tuning ([ADR-0002](docs/adr/0002-fine-tuning-on-kaggle-only.md)).

## Output contract

For each Script the pipeline returns a `ScoreResult` (`packages/shared/src/index.ts`):

- `taskType`: the Task Type
- `overall`: `{ band }`, in half-band steps from 0 to 9
- `criteria`: `{ band }` per Criterion, a whole number from 0 to 9
- Feedback for each Criterion (stage 6)

Invariants:

- `overall.band` follows from the four Criterion Bands under the standard IELTS derivation.

## Stages

### 1. Ingestion

- **In:** raw Script text, Task Type, Prompt (plus the visual's description for Task 1 Academic).
- **Does:** normalise the text (Unicode, whitespace, line endings), split it into paragraphs and sentences, and reject empty or non-English input.
- **Out:** a normalised Script with the Prompt attached.
- **Fails when:** the Script is empty or the Task Type is missing. That's a user-facing error, not a score.

### 2. Deterministic feature extraction

- **In:** the normalised Script.
- **Does:** compute Features with no model call: word count relative to the Word Floor, paragraph count, sentence-length distribution, lexical diversity, spelling-error rate, and the cohesive devices used.
- **Out:** a Feature vector.
- **Why it's separate:** Features cost nothing, are reproducible, and anchor Calibration. The Word Floor penalty is applied here as a hard rule, not left to the model.

### 3. Gemini rubric scoring

- **In:** the Script, the Prompt, and the Band Descriptors for the Task Type. It deliberately gets no Features: stages 2 and 3 run in parallel, and keeping counts out of the prompt avoids anchoring the model. Features and model bands meet in stages 4–5.
- **Does:** each Scoring Run asks Gemini for a Criterion Band on all four Criteria, as structured JSON, each with evidence quoted from the Script.
- **Out:** raw Criterion Bands plus evidence for each Scoring Run. Output that fails the schema is retried and never repaired by guesswork.
- **Budget:** the number of Scoring Runs per Script is bounded by free-tier rate limits (ADR-0001).

### 4. Calibration

- **In:** the raw Criterion Bands from each Scoring Run.
- **Does:** maps each raw band onto the examiner scale with a swappable calibrator (`isotonic` or `linear`, chosen by name) fitted on the Gold Set.
- **Out:** a calibrated value for each Criterion.
- **Fitted:** in the `calibrate` GitHub Actions workflow ([ADR-0003](docs/adr/0003-small-cpu-fits-in-github-actions.md)). It's stored as JSON and refit as the Gold Set grows.

### 5. Ensembling and cross-check

- **In:** Features and the raw Criterion Bands.
- **Paths for each Criterion:**
  - raw Gemini
  - calibrated Gemini
  - a **deterministic** ridge model over Features only
  - an **ensemble** LightGBM model over Features plus all four Gemini bands
- **Cross-check:** if the ensemble and raw Gemini differ by more than 1 band on any Criterion, a **second Gemini pass** runs, and both passes become paths. Disagreements are never averaged away silently.
- **Criterion Band:** the mean of calibrated and ensemble, rounded half up to a whole band.
- **Overall:** the IELTS rounding of the four Criterion Bands.
- **Out:** `POST /score/final` returns each calibrated Criterion Band with its paths, the overall band, the evidence spans from stage 3, and the normalised Script their offsets index into.

#### Originality: the fifth path (Task 2 only)

- **Runs** alongside stages 2-3, and also on its own before submission (`POST /originality`). It never feeds a band.
- **Embedding path:** the Script and each paragraph are embedded with the Gemini embeddings API (768 dims). Each paragraph's closest passage in the **Template Index** (pgvector) gives a cosine similarity. The highest one is Platt-calibrated to a 0-1 risk.
- **Classifier path:** a logistic regression over the Script embedding, templated vs organic, Platt-calibrated on leave-one-out scores.
- **Blend:** the mean of the two calibrated risks, the same way the Criterion Band blends calibrated and ensemble. At 0.5 or above, the Script is **template-heavy**.
- **Evidence:** paragraphs above the similarity where the embedding path reaches 0.5, as Evidence Spans.
- **Out:** `originality` with the risk, both paths and the evidence. The Script embedding is stored with the saved Script.
- **Fitted:** the `calibrate` workflow writes `originality.json` next to the stage 4-5 artifacts (ADR-0003). n8n triggers the `template-index` workflow weekly, and `calibrate` refits after it succeeds.

### 6. Feedback generation

- **In:** the Criterion Bands, the evidence from each Scoring Run, and the Features.
- **Does:** one Gemini call writes Feedback for each Criterion that cites specific passages of the Script and says what would raise the band by one step.
- **Out:** the complete `ScoreResult` with Feedback.
- **Rule:** Feedback explains the bands. It can't change them.

## Open items

- Persistence runs on the Supabase project `bandcraft` (eu-central-1); the schema is in `supabase/migrations/`. Every scored Script is saved with its full `/score/final` result and one row per Criterion Band. The Gold Set is mirrored in `gold_scripts`, but the `calibrate` workflow still reads the fixtures.
- A Reference Script dataset is still to be sourced. Calibration (stage 4) depends on it.
