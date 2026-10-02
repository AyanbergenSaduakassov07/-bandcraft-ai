"""The real-time examiner: SmallWebRTC audio <-> Gemini Live, driven by Pipecat Flows.

No model runs here. Gemini Live detects turns and speaks on Google's side, so the pipeline has no
local VAD or turn analyzer (ADR-0005). The recorder taps the candidate's audio for scoring.
"""

import logging
import os
from typing import Any, cast

from pipecat.flows import FlowManager
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker, ProcessorUnusablePolicy
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import LLMContextAggregatorPair
from pipecat.processors.audio.audio_buffer_processor import AudioBufferProcessor
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.workers.runner import WorkerRunner

from speaking_api.session import Session, part1_node

log = logging.getLogger(__name__)
LIVE_MODEL = os.environ.get("SPEAKING_LIVE_MODEL", "gemini-3.8-live")
VOICE = os.environ.get("SPEAKING_VOICE", "Charon")  # one British English examiner first
LANGUAGE = "en-GB"
SAMPLE_RATE = 16_000
IDLE_TIMEOUT_S = 300


def examiner() -> GeminiLiveLLMService:
    return GeminiLiveLLMService(
        api_key=os.environ["GEMINI_API_KEY"],
        model=LIVE_MODEL,
        settings=GeminiLiveLLMService.Settings(voice=VOICE, language=LANGUAGE),
    )


async def run_session(connection: SmallWebRTCConnection, session: Session) -> None:
    transport = SmallWebRTCTransport(
        webrtc_connection=connection,
        params=TransportParams(audio_in_enabled=True, audio_out_enabled=True),
    )
    recorder = AudioBufferProcessor(sample_rate=SAMPLE_RATE, num_channels=1)
    llm = examiner()
    context = LLMContext()
    aggregators = LLMContextAggregatorPair(context)
    pipeline = Pipeline(
        [
            transport.input(),
            recorder,
            aggregators.user(),
            llm,
            transport.output(),
            aggregators.assistant(),
        ]
    )
    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(audio_in_sample_rate=SAMPLE_RATE),
        idle_timeout_secs=IDLE_TIMEOUT_S,
        processor_unusable_policy=ProcessorUnusablePolicy.END,
    )
    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)
    # Flows types `llm` as LLMService[BaseLLMAdapter]; Gemini Live's adapter is a subclass, which
    # mypy's invariant generics reject. The runtime contract is the same.
    flow = FlowManager(
        worker=worker, llm=cast(Any, llm), context_aggregator=aggregators, transport=transport
    )
    flow.state["session"] = session
    session.recorder = recorder

    @recorder.event_handler("on_track_audio_data")
    async def on_track(_: object, user: bytes, bot: bytes, rate: int, channels: int) -> None:
        await session.on_track(user, rate)

    @transport.event_handler("on_client_connected")
    async def on_connected(_: object, client: object) -> None:
        await recorder.start_recording()
        await flow.initialize(part1_node(session))

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(_: object, client: object) -> None:
        await recorder.stop_recording()  # a test cut short still scores the Part in progress
        await runner.cancel()

    await runner.run()
