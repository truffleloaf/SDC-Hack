"""Check the combined Vercel router: python scripts/smoke_vercel.py [origin]."""

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

    # The static font confirms the frontend catch-all also serves assets.
    status, _, font = request("/fonts/ibm-plex-sans-latin-400-normal.woff2")
    assert status == 200 and font[:4] == b"wOF2", "Frontend asset routing failed"

    health = api("/api/health")
    assert health["status"] == "ok" and health["counts"]["tasks"] == 31
    seed = api("/api/seed")
    profile = {
        "roleId": "finance-admin",
        "selections": [
            {"taskId": task["id"], "share": task["defaultShare"]}
            for task in seed["tasks"] if task["roleId"] == "finance-admin"
        ],
        "skills": seed["demoPersona"]["skills"],
        "scenario": "normal",
        "hoursPerWeek": 8,
        "freeOnly": False,
    }
    normal = api("/api/analysis", profile)
    fast = api("/api/analysis", {**profile, "scenario": "fast"})
    assert len(normal["tasks"]) == 6 and len(normal["routes"]) == 3
    assert fast["roleExposure"] > normal["roleExposure"]
    assert api("/api/roles/finance-admin/tasks?scenario=fast")["scenario"] == "fast"
    pathway = api("/api/pathways", {**profile, "targetRoleId": "finance-systems-analyst"}, 201)
    assert pathway["weeks"] == 12 and len(pathway["steps"]) == 5
    fetched = api("/api/pathways/" + pathway["id"])
    assert fetched["steps"] == pathway["steps"], "Pathway round trip failed"

    # FastAPI's 404 shape distinguishes its router from Next.js's HTML 404.
    try:
        request("/api/no-such-route")
    except HTTPError as error:
        assert error.code == 404 and json.load(error) == {"detail": "Not Found"}
    else:
        raise AssertionError("Unknown API route should return FastAPI's 404")
    print("PASS: Next.js page/assets; FastAPI health, scenarios, query parameters, pathway round trip, and API 404 routing")


if __name__ == "__main__":
    main()
