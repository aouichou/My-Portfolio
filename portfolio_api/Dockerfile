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

ENV DJANGO_ALLOW_BUILD=true
RUN python manage.py collectstatic --noinput

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN groupadd --system app && useradd --system --gid app --create-home --home-dir /home/app app && \
    chown -R app:app /app /entrypoint.sh

USER app

CMD ["/entrypoint.sh"]