FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ALLOW_DEMO_RESET=false \
    PIVOTT_DATASET=demo

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN mkdir -p /data

# Data configuration:
#   demo (default)  -> -e PIVOTT_DB=sqlite:////data/pivott.db -v pivott-data:/data
#                   or -e DATABASE_URL=postgresql+psycopg://... (demo project)
#   live            -> -e PIVOTT_DATASET=live -e PIVOTT_DB=postgresql+psycopg://...
# The live dataset never auto-seeds and POST /api/seed returns 403, so point
# the live deployment at its own database and run the real-data importer there.
# ALLOW_DEMO_RESET defaults to false here; set it to true for a closed demo.

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
