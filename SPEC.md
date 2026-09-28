# Scoring Pipeline Spec

Terms are defined in [CONTEXT.md](CONTEXT.md). Constraints: Gemini API free tier for every model call ([ADR-0001](docs/adr/0001-gemini-free-tier-only.md)), Kaggle for all fine-tuning ([ADR-0002](docs/adr/0002-fine-tuning-on-kaggle-only.md)).

## Output contract

For each Script the pipeline returns a `ScoreResult` (`packages/shared/src/index.ts`):

- `taskType`: the Task Type
- `overall`: a Band Estimate `{ band, margin }`, with `band` in half-band steps from 0 to 9
- `criteria`: one Band Estimate per Criterion, with `band` a whole number from 0 to 9
- Feedback for each Criterion (stage 6)

Invariants:

- Every band has a margin (`margin ≥ 0`), and none is ever shown without one.
- `band - margin ≥ 0` and `band + margin ≤ 9` (clamp the interval, not the band).
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

- **In:** the raw Criterion Bands from each Scoring Run, and the Features.
- **Does:** map raw bands onto the examiner scale, using a mapping fitted on Reference Scripts (fitted on Kaggle when it needs training, per ADR-0002).
- **Out:** calibrated Criterion Bands for each Scoring Run, plus the calibration's residual error for each Criterion.

### 5. Ensembling and consistency check

- **In:** the calibrated Criterion Bands from every Scoring Run.
- **Does:** combine the runs into one Criterion Band per Criterion. Check that runs agree, that bands are consistent with the Features (for example, a Script under the Word Floor can't top Task Achievement/Response), and that the Overall Band is derived correctly.
- **Out:** a Band Estimate for each Criterion and for the Overall Band. The Margin of Error combines the disagreement between runs with the calibration's residual error, and widens whenever a consistency check fails.

### 6. Feedback generation

- **In:** the Band Estimates, the evidence from each Scoring Run, and the Features.
- **Does:** one Gemini call writes Feedback for each Criterion that cites specific passages of the Script and says what would raise the band by one step.
- **Out:** the complete `ScoreResult` with Feedback.
- **Rule:** Feedback explains the bands. It can't change them.

## Open items

- Supabase MCP is connected in this workspace. It's noted for Prompt 7 (persistence), and no schema has been created yet.
- A Reference Script dataset is still to be sourced. Calibration (stage 4) and any evaluation of the Margin of Error depend on it.
