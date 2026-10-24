"""Canonical team mapping. Frontend copy is generated, never edited separately."""
import json
from pathlib import Path
MAPPING=json.loads((Path(__file__).parent/'data/sdg-map.json').read_text())
def tags(kind,id):
    return MAPPING[kind].get(id,{}).get('sdgs',[4] if kind=='skills' else [8])
