from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.engine import compute_routes, confidence, role_exposure, score_tasks
from app.parsing import ProfileError, parse_profile, read_json
from app.seed import SIGNALS, TASK_BY_ID

router = APIRouter()


@router.post("/analysis")
async def analyze(request: Request):
    body = await read_json(request)
    try:
        profile = parse_profile(body)
    except ProfileError as error:
        return JSONResponse(status_code=400, content={"error": str(error)})

    signals = [*SIGNALS, *profile.get("customSignals", [])]
    lookup = {**TASK_BY_ID, **{task["id"]: task for task in profile.get("customTasks", [])}}
    tasks = score_tasks(profile["selections"], lookup, profile["scenario"], signals)
    user_task_skills = list(dict.fromkeys(skill for task in tasks for skill in task["skills"]))

    routes = compute_routes(
        current_role_id=profile["roleId"],
        user_task_skills=user_task_skills,
        levels=profile["skills"],
        scenario_id=profile["scenario"],
        signals=signals,
        hours_per_week=profile["hoursPerWeek"],
    )

    return {
        "scenario": profile["scenario"],
        "roleExposure": role_exposure(tasks),
        "confidence": confidence(tasks, signals),
        "tasks": tasks,
        "routes": routes,
        "illustrative": True,
    }
