# Speaking runs on Gemini, plus one hosted pronunciation model

Amends [ADR-0001](0001-gemini-free-tier-only.md). IELTS Speaking needs four things Writing didn't: real-time audio transport, an examiner that takes turns and speaks, scoring from audio rather than a transcript, and phoneme-level pronunciation evidence. No model runs inside `apps/speaking-api` or on a developer machine.

**Decision:**

- **Orchestration.** [Pipecat](https://github.com/pipecat-ai/pipecat) (BSD-2) carries the audio over its SmallWebRTC transport and moves the test through Part 1 → 2 → 3 with Pipecat Flows. This is I/O glue, not inference.
- **Examiner.** Pipecat's `GeminiLiveLLMService`. Gemini Live detects turns on Google's side and speaks with a hosted native voice, so there is no local VAD (Silero or smart-turn) and no separate TTS provider. The first accent is British English (`en-GB`); more accents mean more voices and languages on the same service.
- **Scoring from audio.** Each candidate turn's audio goes to the Gemini API (`generateContent` with inline audio), not speech-to-text first, so pace, hesitation and intonation reach the judge. The prompt is evidence-first like `rubric.py`, adapted to the Speaking criteria.
- **Pronunciation, the exception.** [OpenPronounce](https://github.com/Halleck45/OpenPronounce) (MIT; Wav2Vec2 phone recognition, DTW against a synthetic reference) needs a real model. It runs as a **private Hugging Face Space** (Docker, free CPU tier) built from `apps/pronunciation-endpoint/`. `speaking-api` calls it over HTTPS with a Hugging Face token, like any external API. This is the one non-Gemini model in the product.
- **Two estimates per Pronunciation band.** Gemini's audio judgment and OpenPronounce's score are calibrated separately and blended by their mean, the same way the Writing band blends calibrated and ensemble. Both are returned; neither is hidden.
- **Calibration.** Both paths are calibrated against [speechocean762](https://github.com/jimbozhang/speechocean762) (CC BY 4.0; expert scores for read-aloud English by Mandarin L1 speakers) in a GitHub Actions batch that calls the same hosted endpoint and Gemini. It uses leave-one-out isotonic fits, with a report in `docs/benchmarks/` (ADR-0003: small CPU fits run in Actions).

**Why a Space and not Modal, Replicate or an Inference Endpoint:** it's free on the CPU tier, it runs OpenPronounce's own Docker setup unchanged, and a private Space already requires a token.

**Costs we accept:**

- Cold starts on the free tier, so the pronunciation estimate can arrive after the Gemini scores.
- The Gemini free tier's daily caps limit how many utterances the Gemini path can be calibrated on.
- speechocean762 scores read speech on a 0-10 scale, not IELTS bands. Calibration maps each path to that scale, and a fixed linear rescale to 0-9 turns it into a band. The rescale is an assumption until examiner-scored Speaking samples exist, and the benchmark report says so.
- OpenPronounce compares audio against expected text. For spontaneous answers, the expected text is Gemini's transcript of what the candidate meant to say.
