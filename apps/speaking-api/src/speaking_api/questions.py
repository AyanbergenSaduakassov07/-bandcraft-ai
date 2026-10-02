"""Speaking question bank: original questions in the IELTS format, written for BandCraft AI.

Part 1 is short questions on familiar topics; Part 2 is a cue card with one minute to prepare
and up to two minutes to talk; Part 3 discusses the Part 2 theme in the abstract.
"""

import random
from dataclasses import dataclass

PART1_TOPICS: dict[str, list[str]] = {
    "home": [
        "Do you live in a house or a flat?",
        "What do you like most about the place where you live?",
        "Is there anything you would like to change about your home?",
        "Do you plan to live there for a long time?",
    ],
    "work_or_study": [
        "Do you work or are you a student?",
        "What do you enjoy about your work or studies?",
        "Is there anything you find difficult about it?",
        "What would you like to do in the future?",
    ],
    "free_time": [
        "What do you usually do in your free time?",
        "Did you have the same hobbies when you were a child?",
        "Do you prefer spending free time alone or with other people?",
        "Is there a new hobby you would like to try?",
    ],
    "food": [
        "What kind of food do you like to eat?",
        "Do you often cook at home?",
        "Is there any food you disliked as a child but enjoy now?",
        "Do you think people in your country eat more healthily than before?",
    ],
}


@dataclass(frozen=True)
class CueCard:
    topic: str
    prompt: str
    points: tuple[str, ...]
    part3: tuple[str, ...]


CUE_CARDS: tuple[CueCard, ...] = (
    CueCard(
        topic="a skill",
        prompt="Describe a skill you learned that took a long time to master.",
        points=("what the skill is", "how you learned it", "what was difficult about it"),
        part3=(
            "Which skills do you think young people should learn at school?",
            "Is it better to learn a skill from a teacher or by yourself?",
            "How has technology changed the way people learn new skills?",
            "Why do some people give up on learning something new?",
        ),
    ),
    CueCard(
        topic="a journey",
        prompt="Describe a journey you remember well.",
        points=("where you went", "how you travelled", "who you were with"),
        part3=(
            "Why do people enjoy travelling to other countries?",
            "How might travel change in the next twenty years?",
            "Does tourism do more good than harm to local communities?",
            "Should governments spend more on public transport than on roads?",
        ),
    ),
)
CUE_CARD_CLOSING = "and explain why it was important to you."


def pick_test(rng: random.Random) -> tuple[list[tuple[str, list[str]]], CueCard]:
    """Two Part 1 topics and one cue card (which carries its Part 3 questions)."""
    topics = rng.sample(sorted(PART1_TOPICS), 2)
    return [(t, PART1_TOPICS[t]) for t in topics], rng.choice(CUE_CARDS)
