"""A test session: the Flows nodes for Parts 1-3, and scoring each Part when it ends.

Each Part is recorded on its own. When the examiner calls the Part's finish function, the
candidate's track goes to assess_part in the background while the test carries on.
"""

import asyncio
import logging
import random
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from pipecat.flows import FlowManager, NodeConfig

from speaking_api import prompts
from speaking_api.questions import CUE_CARD_CLOSING, CueCard, pick_test
from speaking_api.schemas import Part, PartResult

log = logging.getLogger(__name__)
PREPARATION_S = 60
Assessor = Callable[[bytes, int, Part, list[str]], Awaitable[PartResult]]


class Recorder:
    """What the session needs from pipecat's AudioBufferProcessor."""

    async def start_recording(self) -> None: ...
    async def stop_recording(self) -> None: ...


@dataclass
class Session:
    id: str
    assess: Assessor
    rng: random.Random = field(default_factory=random.Random)
    results: dict[str, PartResult] = field(default_factory=dict)
    errors: dict[str, str] = field(default_factory=dict)
    part: Part = "part1"
    recorder: Recorder | None = None
    tasks: set[asyncio.Task[None]] = field(default_factory=set)

    def __post_init__(self) -> None:
        topics, self.cue_card = pick_test(self.rng)
        self.part1 = [q for _, qs in topics for q in qs]

    def questions(self, part: Part) -> list[str]:
        card: CueCard = self.cue_card
        if part == "part1":
            return self.part1
        if part == "part2":
            return [f"{card.prompt} You should say: {'; '.join(card.points)}; {CUE_CARD_CLOSING}"]
        return list(card.part3)

    async def on_track(self, user_pcm: bytes, sample_rate: int) -> None:
        """AudioBufferProcessor hands over the finished Part's candidate track: score it."""
        part = self.part
        task = asyncio.create_task(self._score(part, user_pcm, sample_rate))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    async def _score(self, part: Part, pcm: bytes, sample_rate: int) -> None:
        try:
            self.results[part] = await self.assess(pcm, sample_rate, part, self.questions(part))
        except Exception as e:  # noqa: BLE001 - one failed Part must not end the test
            log.exception("scoring %s failed", part)
            self.errors[part] = str(e) or type(e).__name__

    async def next_part(self, part: Part | None) -> None:
        """Close the current Part's recording (which triggers scoring) and open the next."""
        if self.recorder:
            await self.recorder.stop_recording()
        if part:
            self.part = part
            if self.recorder:
                await self.recorder.start_recording()


def _session(flow_manager: FlowManager) -> Session:
    session: Session = flow_manager.state["session"]
    return session


async def finish_part_1(flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    """Call after the candidate has answered the last Part 1 question."""
    session = _session(flow_manager)
    await session.next_part("part2")
    return None, part2_node(session)


async def start_preparation(flow_manager: FlowManager) -> tuple[dict[str, Any], NodeConfig]:
    """Call right after telling the candidate their minute to prepare starts now."""
    await asyncio.sleep(PREPARATION_S)
    return {"status": "preparation time is over"}, part2_talk_node()


async def finish_part_2(flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    """Call after saying 'Thank you' at the end of the candidate's long turn."""
    session = _session(flow_manager)
    await session.next_part("part3")
    return None, part3_node(session)


async def finish_part_3(flow_manager: FlowManager) -> tuple[None, NodeConfig]:
    """Call after saying the speaking test is over."""
    await _session(flow_manager).next_part(None)
    return None, NodeConfig(
        name="end", task_messages=[], post_actions=[{"type": "end_conversation"}]
    )


def _task(content: str) -> list[dict[str, str]]:
    return [{"role": "developer", "content": content}]


def part1_node(session: Session) -> NodeConfig:
    questions = "\n".join(f"{i}. {q}" for i, q in enumerate(session.part1, 1))
    return NodeConfig(
        name="part1",
        role_message=prompts.EXAMINER_ROLE,
        task_messages=_task(prompts.PART1_TASK.format(questions=questions)),
        functions=[finish_part_1],
    )


def part2_node(session: Session) -> NodeConfig:
    card = session.cue_card
    text = f"{card.prompt}\nYou should say:\n" + "\n".join(card.points) + f"\n{CUE_CARD_CLOSING}"
    return NodeConfig(
        name="part2",
        task_messages=_task(prompts.PART2_TASK.format(cue_card=text)),
        functions=[start_preparation],
    )


def part2_talk_node() -> NodeConfig:
    return NodeConfig(
        name="part2_talk", task_messages=_task(prompts.PART2_TALK), functions=[finish_part_2]
    )


def part3_node(session: Session) -> NodeConfig:
    questions = "\n".join(f"{i}. {q}" for i, q in enumerate(session.cue_card.part3, 1))
    return NodeConfig(
        name="part3",
        task_messages=_task(
            prompts.PART3_TASK.format(topic=session.cue_card.topic, questions=questions)
        ),
        functions=[finish_part_3],
    )
