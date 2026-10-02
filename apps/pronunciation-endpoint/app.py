"""OpenPronounce over HTTP for apps/speaking-api (ADR-0005).

Runs only inside the Hugging Face Space image, never in speaking-api or on a dev machine.
The Space is private, so Hugging Face checks the caller's token before a request gets here.
"""

import logging
import tempfile

from fastapi import FastAPI, Form, HTTPException, UploadFile
from openpronounce import compare_audio_with_text, load_audio

log = logging.getLogger(__name__)
app = FastAPI(title="BandCraft pronunciation endpoint")
MAX_AUDIO_BYTES = 10 * 1024 * 1024  # about 5 minutes of 16 kHz mono WAV
MAX_TEXT_CHARS = 2_000


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "engine": "openpronounce 0.3.0"}


@app.post("/pronunciation")
def pronunciation(file: UploadFile, expected_text: str = Form(...)) -> dict:
    """Score a recording against the words it should contain. Sync: FastAPI runs it in a thread."""
    audio = file.file.read(MAX_AUDIO_BYTES + 1)
    if not audio or len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "audio missing or over 10 MB")
    if not expected_text.strip() or len(expected_text) > MAX_TEXT_CHARS:
        raise HTTPException(422, "expected_text missing or too long")
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        f.write(audio)
        f.flush()
        result = compare_audio_with_text(load_audio(f.name), expected_text)
    diff = result["differences"]
    return {
        "score": result["score"],
        "transcription": result.get("transcribe", ""),
        "phoneme_error_rate": diff.get("phoneme_error_rate"),
        "word_error_rate": diff.get("word_error_rate"),
        "acoustic_distance": result.get("acoustic_distance"),
        "errors": [
            {k: e.get(k) for k in ("word", "position", "expected", "actual", "confidence")}
            for e in diff.get("errors", [])
        ],
    }
