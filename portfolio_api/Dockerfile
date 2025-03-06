# portfolio_api/Dockerfile

FROM python:3.12-slim

WORKDIR /app

COPY media /app/prepopulated_media
COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

# Collect static files during build
RUN python manage.py collectstatic --noinput

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]