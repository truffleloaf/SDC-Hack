"""Count-derived trends, never inferred from a single window or fabricated history."""
from datetime import date, timedelta
import re
from html import unescape

MIN_POSTINGS = 10
MIN_CHANGE = .05  # five percentage points, absolute share change
SOURCE_URL = 'https://www.arbeitnow.com/api/job-board-api'
# Whole phrase matching after HTML removal and punctuation/whitespace normalization.
# This is a small, explicit English vocabulary; absence is not proof of no skill.
SKILL_TERMS = {
 'programming': ('programming','python','javascript','sql','software development'),
 'active-learning': ('active learning','continuous learning'),
 'complex-problem-solving': ('problem solving','complex problems'),
 'critical-thinking': ('critical thinking',),
 'judgment-and-decision-making': ('decision making','judgement','judgment'),
 'mathematics': ('mathematics','math','statistics'),
 'monitoring': ('monitoring','quality control'),
 'active-listening': ('active listening',), 'coordination': ('coordination','coordinate'),
 'reading-comprehension': ('reading comprehension',),
 'service-orientation': ('customer service','customer support'),
 'social-perceptiveness': ('social perceptiveness','empathy'),
 'speaking': ('presentation','communication','communicate'), 'writing': ('writing','documentation'),
 'management-of-financial-resources': ('budget','budgeting','financial management'),
 'management-of-personnel-resources': ('people management','personnel','team leadership'),
 'time-management': ('time management','scheduling'),
}

def normalized(text):
    return ' ' + re.sub(r'[^a-z0-9]+',' ',unescape(re.sub(r'<[^>]+>',' ',text)).lower()).strip() + ' '

def compute_trends(postings, roles, skills, tasks, task_skills, as_of, previous=None):
    """postings: unique dict rows with role_id, posted_at and optional description/tags.

    Windows: ages 0–29 and 30–89 inclusive; future/older dates excluded.
    Counts use every matched posting, BEFORE display sampling. Rising demand
    reduces modeled task exposure (a team assumption, not a measured causal effect).
    """
    as_of = date.fromisoformat(str(as_of))
    windows = [[], []]; seen=set()
    for p in postings:
        if p['id'] in seen: continue
        seen.add(p['id'])
        age=(as_of-date.fromisoformat(str(p['posted_at'])[:10])).days
        bucket=0 if 0<=age<30 else 1 if 30<=age<90 else None
        if bucket is not None: windows[bucket].append(p)
    totals=[len(w) for w in windows]
    ranges=[{'start':str(as_of-timedelta(days=29)), 'end':str(as_of)}, {'start':str(as_of-timedelta(days=89)), 'end':str(as_of-timedelta(days=30))}]
    entities=[('role',r['id'],r['title']) for r in roles]+[('skill',s['id'],s['name']) for s in skills]
    counts={}; signals=[]
    for kind,id,name in entities:
        key=f'{kind}:{id}'
        def matches(p):
            if kind=='role': return p['role_id']==id
            text=normalized(' '.join(str(p.get(k,'')) for k in ('title','tags','description')))
            return any(normalized(term) in text for term in SKILL_TERMS.get(id,(name,)))
        pair=[sum(matches(p) for p in w) for w in windows]
        counts[key]={'recent':pair[0], 'baseline':pair[1]}
        if min(totals)<MIN_POSTINGS: continue
        shares=[pair[i]/totals[i] for i in (0,1)]; change=shares[0]-shares[1]
        if abs(change)<MIN_CHANGE or sum(pair)<MIN_POSTINGS: continue
        linked={x['task_id'] for x in task_skills if x['skill_id']==id} if kind=='skill' else {t['id'] for t in tasks if t['role_id']==id}
        if not linked: continue
        headline=f"Postings {'for' if kind=='role' else 'mentioning'} {name} {'rose' if change>0 else 'fell'} from {shares[1]:.1%} to {shares[0]:.1%} of matched postings"
        signals.append(dict(id=f'trend-{kind}-{id}',date=str(as_of),headline=headline,sourceName='Arbeitnow job board API',sourceUrl=SOURCE_URL,direction=-1 if change>0 else 1,strength=round(min(1,abs(change)*2),6),impacts=[dict(taskId=t,impact=.1) for t in sorted(linked)],explanation=f"Recent {pair[0]}/{totals[0]} ({ranges[0]['start']} to {ranges[0]['end']}); baseline {pair[1]}/{totals[1]} ({ranges[1]['start']} to {ranges[1]['end']}). {change*100:+.1f} percentage points. Demand direction is mapped inversely to exposure by a team assumption; it does not measure AI adoption.",evidence='verified'))
    snapshot=dict(asOf=str(as_of),sourceName='Arbeitnow job board API',sourceUrl=SOURCE_URL,minimumPostings=MIN_POSTINGS,minimumChange=MIN_CHANGE,windows=dict(recent=ranges[0],baseline=ranges[1]),totals=dict(recent=totals[0],baseline=totals[1]),counts=counts,status='sufficient' if min(totals)>=MIN_POSTINGS else 'insufficient data')
    if previous and previous.get('asOf')!=str(as_of):
        snapshot['sincePrevious']={'asOf':previous['asOf'],'counts':{k:{w: v[w]-previous.get('counts',{}).get(k,{}).get(w,0) for w in ('recent','baseline')} for k,v in counts.items()}}
    return signals,snapshot
