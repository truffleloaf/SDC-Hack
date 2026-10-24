"""Command-line entry point for the Pivott FastAPI service."""

from __future__ import annotations

import os

import uvicorn

from utils import format_greeting, format_catalog_summary, summarize


def main() -> None:
    """Display the active Pivott configuration and start the API."""
    project_name = os.getenv("PROJECT_NAME", "Pivott")
    dataset = os.getenv("PIVOTT_DATASET", "demo")
    host = os.getenv("PIVOTT_HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8001"))

    print(format_greeting(project_name))

    demo_catalog = {
        "roles": 8,
        "tasks": 39,
        "skills": 15,
        "signals": 20,
        "resources": 25,
        "scenarios": 3,
        "sdgs": 17,
    }

    print(format_catalog_summary(demo_catalog))
    print(f"Dataset: {dataset}")
    print(f"API documentation: http://{host}:{port}/docs")
    print(f"Health check: http://{host}:{port}/api/health")

    catalogue_statistics = summarize(
        [float(value) for value in demo_catalog.values()]
    )
    print(f"Catalogue statistics: {catalogue_statistics}")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=os.getenv("PIVOTT_RELOAD", "false").lower() == "true",
    )


if __name__ == "__main__":
    main()
