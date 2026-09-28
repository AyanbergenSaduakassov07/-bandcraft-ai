import json
from pathlib import Path
from typing import Any

GOLD_DIR = Path(__file__).parent / "fixtures" / "gold"


def load_gold() -> list[dict[str, Any]]:
    return [json.loads(p.read_text()) for p in sorted(GOLD_DIR.glob("*.json"))]


def gold_by_id(essay_id: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads((GOLD_DIR / f"{essay_id}.json").read_text())
    return data
