from app.schemas import ProfileInput
from app.reference_seed import DEMO_PERSONA,TASKS

def test_scoring_input_schema_has_no_demographics():
    assert not set(ProfileInput.model_fields)&{'name','age','gender','sex','ethnicity','race','nationality','maritalStatus','photo'}
def test_extra_identity_fields_do_not_change_api_scores(client):
    body=dict(roleId=DEMO_PERSONA['roleId'],skills=DEMO_PERSONA['skills'],selections=[dict(taskId=t['id'],share=t['defaultShare']) for t in TASKS if t['roleId']==DEMO_PERSONA['roleId']])
    baseline=client.post('/api/analysis',json=body).json()
    altered=client.post('/api/analysis',json=dict(body,name='Synthetic name B',age=62,gender='fixture',nationality='fixture',maritalStatus='fixture',photo='fixture')).json()
    assert baseline==altered
