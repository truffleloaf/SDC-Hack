"""Atomic public-data refresh; no database server or custom secret required."""
import json, os, tempfile
from pathlib import Path
from sqlmodel import Session
from app.db import engine, init_db
from app.live.importer import collect, write_catalog, ImportOptions
from app.services.catalog import seed_payload
from app.routers.live import live_status
from app.live.trends import compute_trends

root=Path(__file__).resolve().parents[2]
result=collect(ImportOptions(pages=10,postings_per_role=100))  # failure exits before tracked writes
init_db()
with Session(engine) as session:
    write_catalog(session,result)
    seed=seed_payload(session); meta=live_status(session).model_dump(mode='json')
    jobs=session.exec(__import__('sqlmodel').select(__import__('app.models',fromlist=['JobPosting']).JobPosting)).all()
    postings=[dict(id=p.id,roleId=p.role_id,title=p.title,company=p.company,location=p.location,url=p.url,postedAt=str(p.posted_at),remote=p.remote,tags=p.tags.split(', '),matchedTitle=p.matched_title) for p in jobs]
snapshots=root/'backend/data/snapshots'; older=sorted(snapshots.glob('*.json'))
if older:
    previous=json.loads(older[-1].read_text())
    current=meta['trends']
    if previous['asOf']!=current['asOf']:
        current['sincePrevious']={'asOf':previous['asOf'],'counts':{k:{w:v[w]-previous.get('counts',{}).get(k,{}).get(w,0) for w in ('recent','baseline')} for k,v in current['counts'].items()}}
outputs={root/'pivott-web-application-design/lib/data/job-aliases.json':{s.slug:list(s.aliases) for s in __import__('app.live.roles',fromlist=['ROLES']).ROLES},root/'backend/data/postings.json':result.catalog.observations,root/'pivott-web-application-design/lib/data/live-seed.json':seed,root/'pivott-web-application-design/lib/data/live-meta.json':meta,root/'pivott-web-application-design/lib/data/jobs.live.json':postings,snapshots/f'{result.as_of}.json':meta['trends']}
# Serialize every payload before replacing any output. A source/validation failure changes nothing.
encoded={p:json.dumps(value,default=str,ensure_ascii=False,indent=2)+'\n' for p,value in outputs.items()}
for p,text in encoded.items():
    p.parent.mkdir(parents=True,exist_ok=True)
    temporary=p.with_suffix('.tmp'); temporary.write_text(text); os.replace(temporary,p)
print(f'Refreshed {len(postings)} public postings; {len(seed["signals"])} supported signals')
