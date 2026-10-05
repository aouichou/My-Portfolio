# portfolio_api/Dockerfile

FROM python:3.14-slim

WORKDIR /app

COPY media /app/prepopulated_media
COPY requirements.txt .

# Install psycopg2 dependencies
RUN apt-get update && \
    apt-get install -y libpq-dev gcc && \
    pip install --timeout=300 --retries=5 -r requirements.txt && \
    apt-get remove -y gcc && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY . .

# Build-time collectstatic needs a SECRET_KEY but must NOT have real secrets:
# the flag allows the throwaway-key fallback ONLY for this step. Scoped to the
# RUN (not ENV) so it does not persist into the running container — at runtime
# an unset SECRET_KEY fails loud per settings.py (F2-07 fail-loud posture).
RUN DJANGO_ALLOW_BUILD=true python manage.py collectstatic --noinput

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN groupadd --system app && useradd --system --gid app --create-home --home-dir /home/app app && \
    chown -R app:app /app /entrypoint.sh

USER app

CMD ["/entrypoint.sh"]