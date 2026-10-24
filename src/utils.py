"""Shared presentation helpers for the Pivott backend."""

from __future__ import annotations

from collections.abc import Mapping, Sequence


def format_greeting(name: str) -> str:
    """Return Pivott's project introduction."""
    return (
        f"{name}\n"
        "Don't predict the job. Map the tasks. Route the skills."
    )


def format_catalog_summary(counts: Mapping[str, int]) -> str:
    """Format catalogue counts for command-line output."""
    labels = {
        "roles": "roles",
        "tasks": "tasks",
        "skills": "skills",
        "signals": "signals",
        "resources": "learning resources",
        "scenarios": "scenarios",
        "sdgs": "SDGs",
    }

    details = [
        f"{count} {labels.get(name, name)}"
        for name, count in counts.items()
    ]

    return "Demo catalogue: " + ", ".join(details)


def summarize(
    values: Sequence[float],
) -> dict[str, int | float | None]:
    """Return basic statistics for a collection of numbers."""
    if not values:
        return {
            "count": 0,
            "min": None,
            "max": None,
            "average": None,
        }

    return {
        "count": len(values),
        "min": min(values),
        "max": max(values),
        "average": round(sum(values) / len(values), 2),
    }
