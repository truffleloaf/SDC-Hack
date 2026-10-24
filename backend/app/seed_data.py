"""SQL seed adapter for the canonical, explicitly synthetic demonstration catalogue."""
import json
from pathlib import Path
D = json.loads((Path(__file__).parent / 'data/seed.json').read_text(encoding='utf-8'))
DATA_AS_OF, SEED_VERSION = D['DATA_AS_OF'], D['SEED_VERSION']
def snake(row):
    names = {'hoursPerLevel':'hours_per_level','roleId':'role_id','baseExposure':'base_exposure','humanJudgment':'human_judgment','defaultShare':'default_share','tryThisWeek':'try_this_week','skillId':'skill_id','requiredLevel':'required_level','sourceName':'source_name','sourceUrl':'source_url','taskId':'task_id'}
    return {names.get(k,k):v for k,v in row.items()}
SKILLS = [{**snake(r), 'why':''} for r in D['skills']]
ROLES = [{k:v for k,v in r.items() if k != 'requirements'} for r in D['roles']]
ROLE_REQUIREMENTS = [dict(role_id=r['id'], **snake(q)) for r in D['roles'] for q in r['requirements']]
TASKS = [{k:v for k,v in snake(r).items() if k != 'skills'} for r in D['tasks']]
TASK_SKILLS = [dict(task_id=r['id'],skill_id=s) for r in D['tasks'] for s in r['skills']]
RESOURCES = list(map(snake,D['resources']))
SDGS = D['sdgs']
SCENARIOS = D['scenarios']
DEMO_PERSONA = snake(D['demoPersona'])
# The SQL date is a storage compatibility placeholder for assumptions, never a publication date.
SIGNALS = [{**snake(r), 'date':r.get('date',DATA_AS_OF), 'source_name':r.get('sourceName',''), 'source_url':r.get('sourceUrl',''), 'strength':r.get('assumptionWeight',r['strength']), 'impacts':list(map(snake,r['impacts']))} for r in D['signals']]
