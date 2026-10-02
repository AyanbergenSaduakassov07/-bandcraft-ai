"""Speaking API: WebRTC signalling for the examiner, and each session's Part results.

Only apps/web's server calls this (it checks the signed-in adult first), with SPEAKING_API_KEY.
Media then flows browser <-> this process over WebRTC.
"""

import asyncio
import hmac
import logging
import os
from functools import lru_cache, partial
from typing import Annotated, Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from google import genai
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.request_handler import (
    SmallWebRTCPatchRequest,
    SmallWebRTCRequest,
    SmallWebRTCRequestHandler,
)

from speaking_api.assess import Endpoint, assess_part
from speaking_api.bot import run_session
from speaking_api.pronunciation import load_calibration
from speaking_api.schemas import PartResult
from speaking_api.session import Session

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)
app = FastAPI(title="BandCraft AI Speaking API")
webrtc = SmallWebRTCRequestHandler()
# ponytail: sessions live in this process's memory; move to Supabase when there's more than one.
SESSIONS: dict[str, Session] = {}
BACKGROUND: set[asyncio.Task[None]] = set()


def require_key(x_speaking_key: Annotated[str | None, Header()] = None) -> None:
    expected = os.environ.get("SPEAKING_API_KEY")
    if not expected:
        raise HTTPException(503, "SPEAKING_API_KEY is not set")
    if not x_speaking_key or not hmac.compare_digest(x_speaking_key, expected):
        raise HTTPException(401, "missing or wrong x-speaking-key")


@lru_cache(maxsize=1)
def gemini() -> genai.Client:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "GEMINI_API_KEY is not set")
    return genai.Client(api_key=key)


def endpoint() -> Endpoint | None:
    url, token = os.environ.get("PRONUNCIATION_URL"), os.environ.get("PRONUNCIATION_TOKEN")
    return Endpoint(url, token) if url and token else None


def new_session(session_id: str) -> Session:
    assess = partial(assess_part, gemini(), endpoint=endpoint(), calibration=load_calibration())
    session = Session(id=session_id, assess=assess)
    SESSIONS[session_id] = session
    return session


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "pronunciation_endpoint": endpoint() is not None}


@app.post("/api/offer", dependencies=[Depends(require_key)])
async def offer(body: dict[str, Any]) -> dict[str, str] | None:
    # The web proxy sets request_data.session_id to "<user id>:<client id>"; results use it.
    data = body.get("request_data") or {}
    session_id = str(data.get("session_id") or "") if isinstance(data, dict) else ""

    async def start(connection: SmallWebRTCConnection) -> None:
        session = new_session(session_id or connection.pc_id)
        task = asyncio.create_task(run_session(connection, session))
        BACKGROUND.add(task)
        task.add_done_callback(BACKGROUND.discard)

    return await webrtc.handle_web_request(SmallWebRTCRequest.from_dict(body), start)


@app.patch("/api/offer", dependencies=[Depends(require_key)])
async def ice(body: dict[str, Any]) -> dict[str, str]:
    await webrtc.handle_patch_request(SmallWebRTCPatchRequest(**body))
    return {"status": "ok"}


@app.get("/sessions/{session_id}", dependencies=[Depends(require_key)])
def results(session_id: str) -> dict[str, Any]:
    """Scored Parts so far; a Part appears once its background scoring finishes."""
    session = SESSIONS.get(session_id)
    if session is None:
        raise HTTPException(404, "unknown session")
    parts: dict[str, PartResult] = session.results
    return {
        "part": session.part,
        "results": {k: v.model_dump() for k, v in parts.items()},
        "errors": session.errors,
        "scoring": len(session.tasks),
    }
