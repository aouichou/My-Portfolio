#!/bin/sh
set -e

# Copy prepopulated media to Django's media directory
echo "Copying media files..."
mkdir -p /app/media
cp -r /app/prepopulated_media/* /app/media/ 2>/dev/null || true
echo "Media files copied."

# Wait for external PostgreSQL
echo "Waiting for database at $DB_HOST:$DB_PORT..."
while ! python -c "import socket; s = socket.socket(); s.settimeout(5); s.connect(('$DB_HOST', $DB_PORT))" 2>/dev/null; do
  sleep 2
done

# Run database operations
python manage.py makemigrations
python manage.py migrate

# import projects from JSON file
# echo "Importing projects from projects.json..."
# if [ -f "/app/projects.json" ]; then
#   # Run the import_projects management command
#   python manage.py import_projects /app/projects.json --media-dir /app/media --update
#   echo "Projects imported successfully."
# else
#   echo "Warning: projects.json file not found. Skipping project import."
# fi

# Create a superuser if it doesn't exist
# python -c "
# import os
# import django
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_api.settings')
# django.setup()
# from django.contrib.auth.models import User
# username = os.environ.get('DJANGO_ADMIN_USER', 'admin')
# email = os.environ.get('DJANGO_ADMIN_EMAIL', 'admin@example.com')
# password = os.environ.get('DJANGO_ADMIN_PASSWORD', 'admin')
# if not User.objects.filter(username=username).exists():
#     print(f'Creating superuser {username}')
#     User.objects.create_superuser(username, email, password)
#     print('Superuser created successfully')
# else:
#     user = User.objects.get(username=username)
#     print(f'User {username} already exists. Changing password...')
#     user.set_password(password)
#     user.save()
#     print('Password changed successfully')
# "


# Check if running on Render (production) or locally with docker-compose
if [ -n "$RENDER" ]; then
  # PRODUCTION (Render): Use only Daphne for both HTTP and WebSocket
  # Render only exposes ONE port, so Daphne handles everything
  export PORT=${PORT:-8000}
  echo "🚀 PRODUCTION MODE: Starting Daphne on port $PORT (HTTP + WebSocket)"
  exec daphne -b 0.0.0.0 -p "$PORT" portfolio_api.asgi:application
else
  # LOCAL DEVELOPMENT (docker-compose): Run both servers
  # Nginx routes HTTP to Gunicorn:8080 and WebSocket to Daphne:$PORT
  echo "🔧 LOCAL MODE: Starting Gunicorn (HTTP) and Daphne (WebSocket)"
  
  # Start Gunicorn for HTTP on port 8080 (nginx proxies here)
  gunicorn --bind 0.0.0.0:8080 portfolio_api.wsgi &
  GUNICORN_PID=$!
  
  # Start Daphne for WebSocket on port 8081
  export PORT=${PORT:-8081}
  daphne -b 0.0.0.0 -p "$PORT" portfolio_api.asgi:application &
  DAPHNE_PID=$!
  
  # Signal handler for clean shutdown
  handle_exit() {
    echo "Shutting down servers..."
    kill "$GUNICORN_PID" 2>/dev/null || true
    kill "$DAPHNE_PID" 2>/dev/null || true
    exit 0
  }
  
  trap handle_exit INT TERM
  wait
fi