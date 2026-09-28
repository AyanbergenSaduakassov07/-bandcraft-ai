# BandCraft AI

BandCraft AI scores IELTS Writing responses and explains the score. Each score comes as a band with an explicit margin of error, so a learner knows how much to trust it. BandCraft AI is a standalone product and is not affiliated with IELTS, the British Council, IDP or Cambridge.

## Language

### The test

**Task Type**:
The kind of IELTS Writing task a Script answers. There are three: Task 1 Academic (a report on a chart, table, map or process), Task 1 General Training (a letter), and Task 2 (an argumentative essay, the same for both modules).
_Avoid_: Question type, module (a module is Academic or General Training, which only matters for Task 1)

**Prompt**:
The task instructions and any visual the candidate was given.
_Avoid_: Question, topic

**Script**:
The candidate's written response to one Prompt. It's what gets scored.
_Avoid_: Essay (Task 1 isn't an essay), submission, answer, text

**Word Floor**:
The minimum length a Task Type expects: 150 words for Task 1, 250 for Task 2. A Script under the floor is penalised under Task Achievement/Response.
_Avoid_: Word limit (there's no maximum)

### The rubric

**Criterion**:
One of the four official IELTS Writing assessment criteria: Task Achievement (Task 1) or Task Response (Task 2), Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Each is weighted equally.
_Avoid_: Category, dimension, skill

**Band Descriptors**:
The public descriptions of what each Criterion looks like at each band from 0 to 9. They're the only definition of quality BandCraft AI scores against.
_Avoid_: Rubric (except for the set of four Criteria as a whole), marking scheme

**Criterion Band**:
The band a Script earns on one Criterion, a whole number from 0 to 9.
_Avoid_: Sub-score, criterion score

**Overall Band**:
The band for a whole Script, derived from its four Criterion Bands and reported in half-band steps. When Task 1 and Task 2 are combined into one Writing band, Task 2 counts double.
_Avoid_: Final score, total, grade

### The output contract

**Band Estimate**:
A band together with its Margin of Error. Every band BandCraft AI shows, whether a Criterion Band or an Overall Band, is a Band Estimate. A bare band is never shown on its own.
_Avoid_: Score, prediction, result

**Margin of Error**:
The half-width of the interval the true examiner band is expected to fall in, e.g. 6.5 ± 0.5. It widens when the evidence is weak or scoring runs disagree.
_Avoid_: Confidence, uncertainty (as a number), error bar

**Feedback**:
Guidance tied to a specific Criterion and to specific passages of a Script, explaining the Criterion Band and what would raise it.
_Avoid_: Comments, suggestions, review

### The pipeline

**Feature**:
A measurable property of a Script computed deterministically, without a model, such as word count or paragraph count.
_Avoid_: Metric, signal, stat

**Scoring Run**:
One independent pass of the language model assigning Criterion Bands to a Script against the Band Descriptors.
_Avoid_: Sample, call, inference, attempt

**Calibration**:
The mapping from raw model-assigned bands to bands that match examiner-scored reference Scripts.
_Avoid_: Normalisation, adjustment

**Reference Script**:
A Script with a band assigned by a qualified examiner, used for Calibration and evaluation.
_Avoid_: Gold data, sample essay, ground truth

## Constraints

- All language-model calls go through the Gemini API on the free tier. See [ADR-0001](docs/adr/0001-gemini-free-tier-only.md).
- All fine-tuning runs on Kaggle. Nothing is trained locally. See [ADR-0002](docs/adr/0002-fine-tuning-on-kaggle-only.md).

<!--
Ponytail (inspected 2026-09-28, v4.10.0). It isn't a connected MCP server in this
workspace. It's a Claude Code plugin with a SessionStart hook and six skills:
  - hook: injects "lazy senior dev" rules each session: YAGNI, reuse existing code,
    stdlib/native first, no unrequested abstractions, shortest working diff,
    and `ponytail:` comments to mark deliberate shortcuts.
  - skills: ponytail (the mode), ponytail-review (review a diff for over-engineering),
    ponytail-audit (the same for the whole repo), ponytail-debt (collect `ponytail:`
    comments into a ledger), ponytail-gain (benchmark scoreboard), ponytail-help.
The package also ships an optional ponytail-mcp server (not registered here). Per its
README it exposes one prompt `ponytail` and one read-only tool `ponytail_instructions`,
both of which return the same ruleset text. It only affects how code is written.
It has no role in the product.
-->
