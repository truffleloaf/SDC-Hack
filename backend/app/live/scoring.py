"""Turn real O*NET task statements into Pivott's task fields.

The catalogue is real, but two numbers are Pivott's own model:

- ``base_exposure``: how much of the task is routine information work that a
  tool can draft end to end.
- ``human_judgment``: how much of the task is judgement, negotiation or
  accountability that a person has to own.

Both come from a fixed, auditable cue model over the O*NET task statement plus
the occupation's O*NET job zone. It is a model, not a measurement: the words are
listed below, the weights are constants, and the same statement always scores
the same. The importer records the model version in ``meta``.

    routine        = min(3, distinct automation cues)
    judgment       = min(3, distinct judgement cues)
    physical       = min(2, distinct physical cues)
    base_exposure  = clamp(0.46 + 0.14*routine - 0.12*judgment - 0.12*physical, 0.05, 0.95)
    human_judgment = clamp(0.10 + 0.25*judgment - 0.04*routine + job_zone_bonus, 0.05, 0.95)

The job-zone bonus is +0.06 for zones 4-5 (considerable preparation), -0.03 for
zone 2 (little preparation), and 0 otherwise.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

MODEL_ID = "pivott-onet-cues-v1"

AUTOMATION_CUES = (
    "enter", "record", "post", "reconcile", "verify", "check", "calculate",
    "compute", "compile", "prepare", "process", "file", "maintain", "update",
    "schedule", "monitor", "track", "review", "sort", "classify", "transcribe",
    "proofread", "format", "distribute", "answer", "respond", "route", "invoice",
    "bill", "balance", "summarize", "generate", "produce", "collect", "gather",
    "obtain", "order", "code", "document", "posting",
)

JUDGMENT_CUES = (
    "advise", "recommend", "negotiate", "counsel", "consult", "coach", "mentor",
    "train", "supervise", "evaluate", "assess", "judge", "decide", "determine",
    "approve", "authorize", "resolve", "mediate", "persuade", "present",
    "explain", "interpret", "plan", "develop", "design", "forecast",
    "prioritize", "collaborate", "coordinate", "lead", "direct", "manage",
    "represent", "advocate", "interview", "hire", "diagnose", "allocate",
    "confer", "discuss", "delegate", "assign", "motivate", "communicate",
)

PHYSICAL_CUES = (
    "lift", "carry", "drive", "install", "repair", "clean", "assemble", "paint",
    "weld", "dig", "load", "unload",
)

_SUFFIX = re.compile(r"(ies|ing|ed|es|s)$")
_WORD = re.compile(r"[a-z][a-z'-]*")


def _variants(token: str) -> set[str]:
    """Cheap suffix stripping good enough for the cue lists above."""
    forms = {token}
    stripped = _SUFFIX.sub("", token)
    forms.add(stripped)
    forms.add(stripped + "e")
    if token.endswith("ies"):
        forms.add(token[:-3] + "y")
    return forms


_CUE_SETS = {
    "automation": (AUTOMATION_CUES, frozenset(AUTOMATION_CUES)),
    "judgment": (JUDGMENT_CUES, frozenset(JUDGMENT_CUES)),
    "physical": (PHYSICAL_CUES, frozenset(PHYSICAL_CUES)),
}


def _hits(statement: str, cues: tuple[str, ...], stems: frozenset[str]) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for token in _WORD.findall(statement.lower()):
        if token in seen:
            continue
        if _variants(token) & stems:
            stem = next(cue for cue in cues if _variants(token) & {cue})
            if stem not in found:
                found.append(stem)
                seen.add(token)
    return found


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def job_zone_bonus(job_zone: int | None) -> float:
    if job_zone is None:
        return 0.0
    if job_zone >= 4:
        return 0.06
    if job_zone == 2:
        return -0.03
    return 0.0


@dataclass(frozen=True)
class TaskScore:
    base_exposure: float
    human_judgment: float
    automation_cues: tuple[str, ...] = field(default_factory=tuple)
    judgment_cues: tuple[str, ...] = field(default_factory=tuple)
    physical_cues: tuple[str, ...] = field(default_factory=tuple)

    def basis(self) -> dict:
        return {
            "model": MODEL_ID,
            "automationCues": list(self.automation_cues),
            "judgmentCues": list(self.judgment_cues),
            "physicalCues": list(self.physical_cues),
        }


def score_task(statement: str, job_zone: int | None = None) -> TaskScore:
    """Score one O*NET task statement with the fixed cue model."""
    automation = _hits(statement, *_CUE_SETS["automation"])
    judgment = _hits(statement, *_CUE_SETS["judgment"])
    physical = _hits(statement, *_CUE_SETS["physical"])

    routine_count = min(3, len(automation))
    judgment_count = min(3, len(judgment))
    physical_count = min(2, len(physical))

    base = (
        0.46
        + 0.14 * routine_count
        - 0.12 * judgment_count
        - 0.12 * physical_count
    )
    human = (
        0.10
        + 0.25 * judgment_count
        - 0.04 * routine_count
        + job_zone_bonus(job_zone)
    )
    return TaskScore(
        base_exposure=round(clamp(base, 0.05, 0.95), 2),
        human_judgment=round(clamp(human, 0.05, 0.95), 2),
        automation_cues=tuple(automation),
        judgment_cues=tuple(judgment),
        physical_cues=tuple(physical),
    )


# ---------------------------------------------------------------------------
# Display text
# ---------------------------------------------------------------------------

_STOP_CUT = re.compile(r"[,;:]\s")
_MAX_NAME_CHARS = 72


def _word_count(text: str) -> int:
    return len(text.split())


def short_task_name(statement: str, max_chars: int = _MAX_NAME_CHARS) -> str:
    """Turn a full O*NET task statement into a card-sized name.

    O*NET statements are long and often end in a comma-separated list. The
    shortening keeps the verb and its object, in this order of preference:
    a ``to`` clause, a ``for``/``by`` clause, then the longest sensible comma
    clause, and only then a hard character cut.
    """
    text = statement.strip().rstrip(".")

    for separator in (r"\bto\b", r"\bfor\b", r"\bby\b"):
        match = re.search(separator, text)
        if match:
            head = text[: match.start()].strip(" ,;:")
            if 4 <= _word_count(head) <= 9:
                text = head
                break
    else:
        best = ""
        for match in _STOP_CUT.finditer(text):
            head = text[: match.start()].strip(" ,;:")
            if 6 <= _word_count(head) <= 10 and len(head) > len(best):
                best = head
        if best:
            text = best

    if len(text) > max_chars:
        head = text[:max_chars].rsplit(" ", 1)[0].rstrip(",;:")
        text = head + "…"
    return text[:1].upper() + text[1:] if text else text


def try_this_week(score: TaskScore) -> str:
    """One concrete experiment, chosen from the cue model's own result."""
    if score.base_exposure >= 0.65:
        return (
            "Ask an AI tool to draft this task once, then check every field "
            "against the source record."
        )
    if score.human_judgment >= 0.65:
        return (
            "Write down the judgement calls this task needs; that is the part "
            "to keep and the part to teach."
        )
    return (
        "Time one run of this task, then test one AI step inside it and note "
        "where it stops being reliable."
    )
