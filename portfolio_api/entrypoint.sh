#!/bin/sh
set -e

# Wait for database if needed
while ! nc -z $DB_HOST $DB_PORT; do sleep 1; done

# Run migrations and imports during runtime
python manage.py makemigrations
python manage.py migrate
python manage.py import_projects projects.json

exec gunicorn --bind 0.0.0.0:8080 portfolio_api.wsgi