# ── Stage 1: Install dependencies ─────────────────────────
FROM python:3.12-slim AS base

WORKDIR /app

# System deps for psycopg2
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY packages/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Production image ────────────────────────────
FROM python:3.12-slim AS production

WORKDIR /app

# Runtime deps only (libpq for psycopg2)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from build stage
COPY --from=base /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=base /usr/local/bin /usr/local/bin

# Copy application code
COPY packages/backend/app ./app
COPY packages/backend/gunicorn.conf.py .

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["gunicorn", "app.main:app", "-c", "gunicorn.conf.py"]
