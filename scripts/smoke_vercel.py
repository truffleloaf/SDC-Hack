"""Check the single-service Vercel/Next router: python scripts/smoke_vercel.py [origin]."""

import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def main():
    origin = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000").rstrip("/")

    def request(path, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = Request(origin + path, data=data, headers={"Content-Type": "application/json"})
        with urlopen(req, timeout=60) as response:
            raw = response.read()
            return response.status, response.headers.get("Content-Type", ""), raw

    def api(path, body=None, status=200):
        actual, content_type, raw = request(path, body)
        assert actual == status, (path, actual)
        assert "application/json" in content_type, (path, content_type)
        return json.loads(raw)

    status, content_type, raw = request("/")
    assert status == 200 and "text/html" in content_type
    assert b"Map the tasks." in raw, "Next.js landing page is missing"

    status, _, font = request("/fonts/ibm-plex-sans-latin-400-normal.woff2")
    assert status == 200 and font[:4] == b"wOF2", "Frontend asset routing failed"

    health = api("/api/health")
    assert health["status"] == "ok" and health["counts"]["tasks"] in (31, 60)
    seed = api("/api/seed")
    assert seed["roles"] and seed["tasks"]
    role = seed["roles"][0]
    tasks = [task for task in seed["tasks"] if task["roleId"] == role["id"]]
    assert tasks, "Role has no tasks in the active catalogue"

    profile = {
        "roleId": role["id"],
        "selections": [{"taskId": task["id"], "share": task["defaultShare"]} for task in tasks],
        "skills": {},
        "scenario": "normal",
        "hoursPerWeek": 6,
        "freeOnly": False,
    }
    normal = api("/api/analysis", profile)
    fast = api("/api/analysis", {**profile, "scenario": "fast"})
    assert len(normal["tasks"]) == len(tasks) and len(normal["routes"]) == 3
    assert fast["roleExposure"] >= normal["roleExposure"]
    assert api(f"/api/roles/{role['id']}/tasks?scenario=fast")["scenario"] == "fast"

    target = seed["roles"][1]
    levels = {requirement["skillId"]: 0 for requirement in target["requirements"]}
    pathway = api(
        "/api/pathways",
        {**profile, "skills": levels, "targetRoleId": target["id"]},
        201,
    )
    assert pathway["steps"], "Pathway has no steps for a rated target role"
    fetched = api("/api/pathways/" + pathway["id"])
    assert fetched["steps"] == pathway["steps"], "Pathway round trip failed"

    try:
        request("/api/no-such-route")
    except HTTPError as error:
        assert error.code == 404
    else:
        raise AssertionError("Unknown API route should return 404")
    print("PASS: page/assets; live-or-demo health, analysis, scenario, role tasks, pathway round trip, API 404")


if __name__ == "__main__":
    main()
