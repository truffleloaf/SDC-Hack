import json
from pathlib import Path
from app.sdg import MAPPING
from app.reference_seed import SKILLS,ROLES
from app.engine import compute_routes

def test_canonical_mapping_and_tags():
    root=Path(__file__).resolve().parents[2]
    assert MAPPING==json.loads((root/'pivott-web-application-design/lib/data/sdg-map.json').read_text())
    assert len(MAPPING['goals'])==17
    for row in SKILLS+ROLES:
        assert row['sdgs'] and set(row['sdgs'])<=set(range(1,18))
def test_api_skills_have_tags(client):
    assert all(s['sdgs'] for s in client.get('/api/seed').json()['skills'])

def test_focus_changes_api_ranking(client):
    from app.reference_seed import DEMO_PERSONA,TASKS
    def aisyah(**kw):
        return dict(roleId=DEMO_PERSONA["roleId"],skills=DEMO_PERSONA["skills"],selections=[dict(taskId=t["id"],share=t["defaultShare"]) for t in TASKS if t["roleId"]==DEMO_PERSONA["roleId"]],**kw)
    baseline=client.post('/api/analysis',json=aisyah()).json()['routes']
    focused=client.post('/api/analysis',json=aisyah(sdgFocus=[10])).json()['routes']
    assert [r['roleId'] for r in focused]!=[r['roleId'] for r in baseline]
    assert all(r['score']==r['unadjustedScore']+r['sdgBonus'] for r in focused)
