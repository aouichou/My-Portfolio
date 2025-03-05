FROM python:3.12-slim

WORKDIR /app

COPY media /app/prepopulated_media
COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

# Collect static files during build
RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "portfolio_api.wsgi"]