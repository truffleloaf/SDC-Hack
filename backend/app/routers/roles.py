from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.engine import role_exposure, score_tasks
from app.seed import ROLE_BY_ID, SIGNALS, TASKS_BY_ROLE

router = APIRouter()


@router.get("/roles/{role_id}/tasks")
def role_tasks(role_id: str, scenario: str = "normal"):
    role = ROLE_BY_ID.get(role_id)
    if role is None:
        return JSONResponse(status_code=404, content={"error": "Role not found"})

    scenario_id = "fast" if scenario == "fast" else "normal"
    tasks = TASKS_BY_ROLE.get(role_id, [])
    lookup = {task["id"]: task for task in tasks}
    scored = score_tasks(
        [{"taskId": task["id"], "share": task["defaultShare"]} for task in tasks],
        lookup,
        scenario_id,
        SIGNALS,
    )
    return {
        "role": role,
        "scenario": scenario_id,
        "roleExposure": role_exposure(scored),
        "tasks": scored,
    }
