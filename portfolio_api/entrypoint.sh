#!/bin/sh
set -e

# Copy prepopulated media to Django's media directory
echo "Copying media files..."
mkdir -p /app/media
cp -r /app/prepopulated_media/* /app/media/ 2>/dev/null || true
echo "Media files copied."

# Wait for external Render PostgreSQL
echo "Waiting for database at $DB_HOST:$DB_PORT..."
while ! python -c "import socket; s = socket.socket(); s.settimeout(5); s.connect(('$DB_HOST', $DB_PORT))" 2>/dev/null; do
  sleep 2
done

# Run database operations
python manage.py makemigrations
python manage.py migrate

# Attempt data import (with error handling)
if [ -f "projects.json" ]; then
  echo "Starting data import..."
  if python manage.py import_projects projects.json; then
    echo "Data import completed successfully"
  else
    echo "Data import failed, continuing deployment"
  fi
else
  echo "projects.json not found, skipping import"
fi

exec gunicorn --bind 0.0.0.0:8080 portfolio_api.wsgi