from fastapi import APIRouter

from app.engine import age_days, recency
from app.seed import DATA_AS_OF, SIGNALS

router = APIRouter()


@router.get("/signals")
def list_signals() -> dict:
    signals = [
        {**signal, "recency": None if signal["evidence"] == "assumption" else recency(age_days(signal["date"]))}
        for signal in SIGNALS
    ]
    signals.sort(key=lambda signal: signal.get("date", ""), reverse=True)
    return {"asOf": DATA_AS_OF, "count": len(signals), "signals": signals}
