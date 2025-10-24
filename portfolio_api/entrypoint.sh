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


# Set PORT if not set (Render provides this)
export PORT=${PORT:-8000}
echo "Starting Daphne on port $PORT (handles both HTTP and WebSocket)"

# Start Daphne - it handles both HTTP and WebSocket via ASGI
# No need for Gunicorn - Daphne is production-ready
exec daphne -b 0.0.0.0 -p $PORT portfolio_api.asgi:application