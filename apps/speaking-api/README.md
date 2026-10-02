# speaking-api

IELTS Speaking: a real-time AI examiner and scoring from the candidate's voice. No model runs in this process or on a developer machine ([ADR-0005](../../docs/adr/0005-speaking-providers-and-hosted-pronunciation.md)).

```
src/speaking_api/
├── main.py            FastAPI: WebRTC signalling (POST/PATCH /api/offer), GET /sessions/{id}, /health
├── bot.py             Pipecat pipeline: SmallWebRTC audio <-> Gemini Live examiner, plus a recorder
├── session.py         Pipecat Flows nodes for Parts 1 -> 2 -> 3; each Part is scored as it ends
├── questions.py       Original question bank (Part 1 topics, cue cards with their Part 3 questions)
├── prompts.py         Examiner instructions and the Speaking scoring prompt
├── scoring.py         Gemini scores a Part from its audio, evidence first (like scoring-api rubric.py)
├── pronunciation.py   Hosted OpenPronounce client, per-answer clips, calibration, blend
├── assess.py          One Part's result: four criteria, Pronunciation from two estimates
└── calibrate.py       speechocean762 calibration of both Pronunciation paths (speaking-calibrate workflow)
```

## How a Part is scored

1. The examiner (Gemini Live, British English voice) asks the Part's questions. Gemini Live detects turns on Google's side.
2. When the examiner calls the Part's finish function, the candidate's audio for that Part goes to Gemini as WAV. Gemini returns each answer's timestamps and transcript, then evidence, analysis and a band per criterion.
3. Each answer is cut from the audio by those timestamps and sent, with its transcript as the expected text, to the hosted OpenPronounce endpoint (`apps/pronunciation-endpoint`).
4. Pronunciation is the mean of the two calibrated estimates, like the Writing band. Both are returned.

## Run it

Set `.env` from `.env.example`. Then run `uv run uvicorn speaking_api.main:app --port 8001`, set `SPEAKING_API_URL` and `SPEAKING_API_KEY` in `apps/web`, and open `/speak`.
