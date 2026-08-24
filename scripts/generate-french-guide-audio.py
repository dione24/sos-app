#!/usr/bin/env python3
"""Generate the bundled French guide narration from the reviewed guide text."""

from __future__ import annotations

import argparse
import asyncio
import json
from pathlib import Path

import edge_tts


DEFAULT_VOICE = "fr-FR-DeniseNeural"


def spoken_version(text: str) -> str:
    """Keep the medical wording intact while making symbols unambiguous aloud."""
    return (
        text.replace("100–120", "cent à cent vingt")
        .replace("5 cm", "cinq centimètres")
        .replace("6 cm", "six centimètres")
        .replace("15–20", "quinze à vingt")
        .replace("2–3", "deux à trois")
        .replace("–", " à ")
    )


async def generate(args: argparse.Namespace) -> None:
    project_root = Path(__file__).resolve().parents[1]
    guides_path = project_root / "assets/data/first-aid-guides.json"
    output_root = project_root / "assets/audio/fr"
    guides = json.loads(guides_path.read_text(encoding="utf-8"))

    total = sum(len(guide["steps"]) for guide in guides)
    completed = 0
    for guide in guides:
        guide_dir = output_root / guide["id"]
        guide_dir.mkdir(parents=True, exist_ok=True)
        for step in guide["steps"]:
            completed += 1
            destination = guide_dir / f"{step['id']}.mp3"
            if destination.exists() and destination.stat().st_size > 1_000 and not args.force:
                print(f"[{completed:02d}/{total}] conservé  {destination.relative_to(project_root)}", flush=True)
                continue
            narration = edge_tts.Communicate(
                spoken_version(step["fr"]),
                args.voice,
                rate=args.rate,
                pitch=args.pitch,
                volume=args.volume,
            )
            await narration.save(str(destination))
            print(f"[{completed:02d}/{total}] généré   {destination.relative_to(project_root)}", flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--voice", default=DEFAULT_VOICE)
    parser.add_argument("--rate", default="-8%")
    parser.add_argument("--pitch", default="-2Hz")
    parser.add_argument("--volume", default="+0%")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    asyncio.run(generate(parse_args()))
