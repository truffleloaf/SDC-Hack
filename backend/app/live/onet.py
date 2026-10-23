"""O*NET database: download, cache and parse the official text release.

Pivott's live catalogue is built from the U.S. Department of Labor O*NET
database (CC BY 4.0). The text release is a single zip with tab-separated
files; this module turns the files Pivott needs into immutable dataclasses.

Nothing here talks to the database or reads Pivott config: :func:`parse_database`
takes a zip path and returns an :class:`OnetCatalog`, which makes the parser
testable with a small fixture archive.

Files used (names as published in ``db_<version>_text.zip``):

- ``Occupation Data.txt``           occupation code, title, description
- ``Task Statements.txt``           task statements per occupation
- ``Task Ratings.txt``              IM (importance), FT (frequency), RT (relevance)
- ``Essential Skills.txt``          skills (2.A / 2.B elements), IM + LV
- ``Transferable Skills.txt``       remaining skill elements, IM + LV
- ``Job Zones.txt``                 preparation level (1-5)
- ``Job Titles.txt``                reported job titles, used to match live postings
- ``Tasks to DWAs.txt``             task -> detailed work activity
- ``GWAs to IWAs to DWAs.txt``      detailed work activity -> generalized work activity
- ``Essential Skills to Work Activities.txt``  skill -> work activity

The last three form an official crosswalk chain (task -> DWA -> GWA -> skill)
that gives every task real skill links. Tasks without a crosswalk fall back to
the occupation's most important skills.
"""

from __future__ import annotations

import csv
import io
import os
import re
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator

ONET_VERSION = "31.0"
ONET_RELEASE = "2026-08"
ONET_DOWNLOAD_URL = (
    "https://www.onetcenter.org/dl_files/database/db_31_0_text.zip"
)
ONET_LICENSE_URL = "https://www.onetcenter.org/license_db.html"
ONET_DOCS_URL = "https://www.onetcenter.org/dictionary/31.0/text/"

MAX_TASK_SKILLS = 3
MIN_SKILL_IMPORTANCE = 1.5


class OnetError(RuntimeError):
    """Raised when the O*NET archive is missing files or cannot be parsed."""


@dataclass(frozen=True)
class OnetTask:
    task_id: str
    statement: str
    importance: float
    frequency: float
    task_type: str
    rated: bool = True
    emerging: bool = False


@dataclass(frozen=True)
class OnetSkill:
    element_id: str
    name: str
    importance: float
    level: float


@dataclass(frozen=True)
class OnetOccupation:
    code: str
    title: str
    description: str
    job_zone: int | None
    tasks: tuple[OnetTask, ...]
    skills: tuple[OnetSkill, ...]
    job_titles: tuple[str, ...]
    task_skills: dict[str, tuple[str, ...]]


@dataclass(frozen=True)
class OnetCatalog:
    version: str
    release: str
    source_url: str
    occupations: dict[str, OnetOccupation]

    def get(self, code: str) -> OnetOccupation:
        try:
            return self.occupations[code]
        except KeyError as exc:  # pragma: no cover - guarded by callers
            raise OnetError(f"occupation {code!r} is not in the O*NET release") from exc


# ---------------------------------------------------------------------------
# Download / cache
# ---------------------------------------------------------------------------


def default_cache_dir() -> Path:
    return Path(os.getenv("PIVOTT_CACHE_DIR") or ".cache").expanduser()


def cache_path(cache_dir: Path | str | None = None, version: str = ONET_VERSION) -> Path:
    root = Path(cache_dir) if cache_dir else default_cache_dir()
    return root / "onet" / f"db_{version.replace('.', '_')}_text.zip"


def download_database(
    destination: Path | str | None = None,
    *,
    version: str = ONET_VERSION,
    url: str = ONET_DOWNLOAD_URL,
    force: bool = False,
) -> Path:
    """Download the O*NET text release once and return the cached zip path."""
    target = Path(destination) if destination else cache_path(version=version)
    if target.exists() and target.stat().st_size > 1_000_000 and not force:
        return target

    import httpx

    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_suffix(".part")
    with httpx.stream("GET", url, timeout=180, follow_redirects=True) as response:
        response.raise_for_status()
        with partial.open("wb") as handle:
            for chunk in response.iter_bytes():
                handle.write(chunk)
    if partial.stat().st_size < 1_000_000:
        partial.unlink(missing_ok=True)
        raise OnetError(f"downloaded archive is unexpectedly small: {url}")
    partial.replace(target)
    return target


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------


def _entries(archive: zipfile.ZipFile) -> dict[str, str]:
    return {Path(name).name: name for name in archive.namelist()}


def _rows(
    archive: zipfile.ZipFile, files: dict[str, str], name: str
) -> Iterator[dict[str, str]]:
    member = files.get(name)
    if member is None:
        raise OnetError(f"{name} is missing from the O*NET archive")
    with archive.open(member) as handle:
        text = io.TextIOWrapper(handle, encoding="utf-8-sig", newline="")
        yield from csv.DictReader(text, delimiter="\t")


def _number(value: str | None) -> float | None:
    try:
        return float(value) if value not in (None, "", "n/a") else None
    except ValueError:
        return None


def _normalise_title(value: str) -> str:
    text = value.lower()
    text = re.sub(r"\(.*?\)", " ", text)
    text = re.sub(r"[^a-z0-9\u00e0-\u00ff/ ]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _gwa_of(element_id: str) -> str:
    """Generalized work activity id: the first four dotted segments."""
    return ".".join(element_id.split(".")[:4])


def parse_database(
    archive_path: Path | str,
    *,
    codes: Iterable[str] | None = None,
    version: str = ONET_VERSION,
    release: str = ONET_RELEASE,
    source_url: str = ONET_DOWNLOAD_URL,
) -> OnetCatalog:
    """Parse the O*NET text archive into a catalogue.

    ``codes`` limits parsing to a subset of O*NET-SOC codes; when omitted every
    occupation in the release is loaded.
    """
    wanted = {code.strip() for code in codes} if codes is not None else None
    path = Path(archive_path)
    if not path.exists():
        raise OnetError(f"O*NET archive not found: {path}")

    with zipfile.ZipFile(path) as archive:
        files = _entries(archive)

        occupations: dict[str, dict] = {}
        for row in _rows(archive, files, "Occupation Data.txt"):
            code = row["O*NET-SOC Code"].strip()
            if wanted is not None and code not in wanted:
                continue
            occupations[code] = {
                "title": row["Title"].strip(),
                "description": (row.get("Description") or "").strip(),
            }

        if not occupations:
            raise OnetError(
                "no occupations matched the requested O*NET-SOC codes: "
                + ", ".join(sorted(wanted or []))
            )

        job_zones: dict[str, int] = {}
        for row in _rows(archive, files, "Job Zones.txt"):
            code = row["O*NET-SOC Code"].strip()
            if code in occupations:
                zone = _number(row.get("Job Zone"))
                if zone:
                    job_zones[code] = int(zone)

        # task statements -------------------------------------------------
        tasks: dict[str, list[dict]] = {}
        for row in _rows(archive, files, "Task Statements.txt"):
            code = row["O*NET-SOC Code"].strip()
            if code not in occupations:
                continue
            tasks.setdefault(code, []).append(
                {
                    "task_id": row["Task ID"].strip(),
                    "statement": row["Task"].strip(),
                    "task_type": (row.get("Task Type") or "Core").strip(),
                }
            )

        # task ratings (IM importance, FT frequency distribution) ----------
        importance: dict[tuple[str, str], float] = {}
        frequency: dict[tuple[str, str], float] = {}
        ft_accumulator: dict[tuple[str, str], list[tuple[int, float]]] = {}
        for row in _rows(archive, files, "Task Ratings.txt"):
            code = row["O*NET-SOC Code"].strip()
            if code not in occupations:
                continue
            key = (code, row["Task ID"].strip())
            scale = row.get("Scale ID", "").strip()
            if scale == "IM":
                value = _number(row.get("Data Value"))
                if value is not None:
                    importance[key] = value
            elif scale == "FT":
                value = _number(row.get("Data Value"))
                category = _number(row.get("Category"))
                if value is not None and category:
                    ft_accumulator.setdefault(key, []).append((int(category), value))
        for key, buckets in ft_accumulator.items():
            total = sum(weight for _category, weight in buckets)
            if total > 0:
                frequency[key] = sum(
                    category * weight for category, weight in buckets
                ) / total

        # occupations without an IM rating keep a neutral 3.0 so they can
        # still be ranked, but they are marked as unrated in the importer.
        rated_tasks: dict[str, list[OnetTask]] = {}
        for code, rows in tasks.items():
            collected: list[OnetTask] = []
            for row in rows:
                key = (code, row["task_id"])
                collected.append(
                    OnetTask(
                        task_id=row["task_id"],
                        statement=row["statement"],
                        importance=importance.get(key, 3.0),
                        frequency=frequency.get(key, 0.0),
                        task_type=row["task_type"],
                        rated=key in importance,
                    )
                )
            rated_tasks[code] = collected

        # skills ----------------------------------------------------------
        skill_values: dict[tuple[str, str], dict[str, float | str]] = {}
        for name in ("Essential Skills.txt", "Transferable Skills.txt"):
            for row in _rows(archive, files, name):
                code = row["O*NET-SOC Code"].strip()
                if code not in occupations:
                    continue
                if (row.get("Not Relevant") or "").strip().upper() == "Y":
                    continue
                element_id = row["Element ID"].strip()
                key = (code, element_id)
                entry = skill_values.setdefault(
                    key,
                    {"name": row["Element Name"].strip(), "IM": 0.0, "LV": 0.0},
                )
                scale = row.get("Scale ID", "").strip()
                value = _number(row.get("Data Value"))
                if value is not None and scale in ("IM", "LV"):
                    entry[scale] = value

        skills: dict[str, list[OnetSkill]] = {}
        for (code, element_id), entry in skill_values.items():
            im = float(entry["IM"] or 0.0)
            if im < MIN_SKILL_IMPORTANCE:
                continue
            skills.setdefault(code, []).append(
                OnetSkill(
                    element_id=element_id,
                    name=str(entry["name"]),
                    importance=im,
                    level=float(entry["LV"] or 0.0),
                )
            )
        for code in skills:
            skills[code].sort(key=lambda skill: (-skill.importance, skill.name))

        # reported job titles --------------------------------------------
        job_titles: dict[str, list[str]] = {}
        seen_titles: dict[str, set[str]] = {}
        for row in _rows(archive, files, "Job Titles.txt"):
            code = row["O*NET-SOC Code"].strip()
            if code not in occupations:
                continue
            title = (row.get("Job Title") or "").strip()
            if len(title) < 3:
                continue
            key = _normalise_title(title)
            if not key or key in seen_titles.setdefault(code, set()):
                continue
            seen_titles[code].add(key)
            job_titles.setdefault(code, []).append(title)

        # crosswalk chain: task -> DWA -> GWA -> essential skill -----------
        skill_by_gwa: dict[str, list[str]] = {}
        for row in _rows(archive, files, "Essential Skills to Work Activities.txt"):
            gwa = row["Work Activities Element ID"].strip()
            element = row["Essential Skills Element ID"].strip()
            skill_by_gwa.setdefault(gwa, []).append(element)

        dwa_to_gwa: dict[str, str] = {}
        for row in _rows(archive, files, "GWAs to IWAs to DWAs.txt"):
            dwa = row["DWA Element ID"].strip()
            gwa = row["GWA Element ID"].strip()
            if dwa and gwa:
                dwa_to_gwa[dwa] = gwa

        task_dwas: dict[tuple[str, str], list[str]] = {}
        for row in _rows(archive, files, "Tasks to DWAs.txt"):
            code = row["O*NET-SOC Code"].strip()
            if code not in occupations:
                continue
            key = (code, row["Task ID"].strip())
            task_dwas.setdefault(key, []).append(row["DWA Element ID"].strip())

        names_by_element = {
            skill.element_id: skill.name
            for rows in skills.values()
            for skill in rows
        }

        task_skill_links: dict[tuple[str, str], tuple[str, ...]] = {}
        for code, role_tasks in rated_tasks.items():
            available = {skill.name for skill in skills.get(code, [])}
            fallback = tuple(skill.name for skill in skills.get(code, [])[:MAX_TASK_SKILLS])
            for task in role_tasks:
                hits: dict[str, int] = {}
                for dwa in task_dwas.get((code, task.task_id), []):
                    gwa = dwa_to_gwa.get(dwa) or _gwa_of(dwa)
                    for element in skill_by_gwa.get(gwa, []):
                        name = names_by_element.get(element)
                        if name and name in available:
                            hits[name] = hits.get(name, 0) + 1
                ranked = sorted(hits.items(), key=lambda item: (-item[1], item[0]))
                task_skill_links[(code, task.task_id)] = tuple(
                    name for name, _count in ranked[:MAX_TASK_SKILLS]
                ) or fallback

        catalog_occupations: dict[str, OnetOccupation] = {}
        for code, meta in occupations.items():
            catalog_occupations[code] = OnetOccupation(
                code=code,
                title=meta["title"],
                description=meta["description"],
                job_zone=job_zones.get(code),
                tasks=tuple(rated_tasks.get(code, [])),
                skills=tuple(skills.get(code, [])),
                job_titles=tuple(job_titles.get(code, [])),
                task_skills={
                    task.task_id: task_skill_links.get((code, task.task_id), ())
                    for task in rated_tasks.get(code, [])
                },
            )

    return OnetCatalog(
        version=version,
        release=release,
        source_url=source_url,
        occupations=catalog_occupations,
    )


def load_catalog(
    *,
    codes: Iterable[str] | None = None,
    cache_dir: Path | str | None = None,
    offline: bool = False,
    force_download: bool = False,
) -> OnetCatalog:
    """Return the parsed catalogue, downloading the archive when needed."""
    path = cache_path(cache_dir)
    if not path.exists():
        if offline:
            raise OnetError(
                f"offline mode but no cached O*NET archive at {path}; "
                "run once without --offline"
            )
        path = download_database(path, force=force_download)
    return parse_database(path, codes=codes)
