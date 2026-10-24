from datetime import date,timedelta
from app.live.trends import compute_trends

def fixture(recent=20,baseline=20):
    return [dict(id=f'{i}-{w}',role_id='analyst',posted_at=str(date(2026,10,24)-timedelta(days=days)),title='Python analyst' if (w==0 and i<10) or (w==1 and i<2) else 'Analyst',description='',tags='') for w,n,days in [(0,recent,5),(1,baseline,45)] for i in range(n)]
def compute(rows):
    return compute_trends(rows,[dict(id='analyst',title='Analyst')],[dict(id='programming',name='Programming')],[dict(id='task',role_id='analyst')],[dict(task_id='task',skill_id='programming')],'2026-10-24')
def test_fixed_counts_and_signal_golden():
    signals,snapshot=compute(fixture())
    assert snapshot['totals']==dict(recent=20,baseline=20)
    assert len(signals)==1
    s=signals[0]
    assert s['headline']=='Postings mentioning Programming rose from 10.0% to 50.0% of matched postings'
    assert s['strength']==.8 and s['direction']==-1
    assert s['impacts']==[dict(taskId='task',impact=.1)]
    assert s['date']=='2026-10-24' and s['evidence']=='verified'
def test_thin_single_and_equal_windows():
    for r,b in [(9,20),(20,0),(0,20)]:
        s,m=compute(fixture(r,b)); assert s==[] and m['status']=='insufficient data'
    rows=fixture()
    for p in rows: p['title']='Python analyst'
    assert compute(rows)[0]==[]
def test_boundary_future_and_duplicates():
    rows=fixture()+[dict(id='future',posted_at='2026-10-25',role_id='analyst',title='Python')]
    assert compute(rows+rows)[1]['totals']==dict(recent=20,baseline=20)
