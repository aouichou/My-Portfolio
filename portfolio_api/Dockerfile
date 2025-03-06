# portfolio_api/Dockerfile

FROM python:3.12-slim

WORKDIR /app

COPY media /app/prepopulated_media
COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

RUN python manage.py makemigrations
RUN python manage.py migrate

# Collect static files during build
RUN python manage.py collectstatic --noinput

# Add data import after migrations
RUN python manage.py import_projects projects.json

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "portfolio_api.wsgi"]