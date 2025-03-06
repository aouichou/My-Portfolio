# portfolio_api/Dockerfile

FROM python:3.12-slim

WORKDIR /app

COPY media /app/prepopulated_media
COPY requirements.txt .

# Install psycopg2 dependencies
RUN apt-get update && \
    apt-get install -y libpq-dev gcc && \
    pip install -r requirements.txt && \
    apt-get remove -y gcc && \
    apt-get autoremove -y

COPY . .

# Build-time secret (will be overridden by Render's env vars)
ENV SECRET_KEY=build-key-123
RUN python manage.py collectstatic --noinput

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]