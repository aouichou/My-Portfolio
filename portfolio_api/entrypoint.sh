#!/bin/sh
set -e

# Wait for external Render PostgreSQL
echo "Waiting for database at $DB_HOST:$DB_PORT..."
while ! python -c "import socket; s = socket.socket(); s.settimeout(5); s.connect(('$DB_HOST', $DB_PORT))" 2>/dev/null; do
  sleep 2
done

# Run database operations
python manage.py makemigrations
python manage.py migrate
python manage.py import_projects projects.json

exec gunicorn --bind 0.0.0.0:8080 portfolio_api.wsgi