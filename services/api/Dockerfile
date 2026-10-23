FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
# Patient pip: on slow links PyPI index pages can stall past pip's default 15 s,
# which surfaces as a misleading "from versions: none".
ENV PIP_DEFAULT_TIMEOUT=120 PIP_RETRIES=10
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
# media-data: local photo and clip storage (a volume in docker compose).
RUN useradd --create-home api && mkdir -p /app/media-data && chown -R api /app
USER api
EXPOSE 8000
# Migrations run first, then the server. The worker uses the same image with a different command.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers"]
