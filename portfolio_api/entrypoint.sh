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

# Create a superuser if it doesn't exist and if it exists change the password
python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portfolio_api.settings')
django.setup()
from django.contrib.auth.models import User
username = os.environ.get('DJANGO_ADMIN_USER', 'admin')
email = os.environ.get('DJANGO_ADMIN_EMAIL', 'admin@example.com')
password = os.environ.get('DJANGO_ADMIN_PASSWORD', 'admin')
if not User.objects.filter(username=username).exists():
    print(f'Creating superuser {username}')
    User.objects.create_superuser(username, email, password)
    print('Superuser created successfully')
else:
    user = User.objects.get(username=username)
	print(f'User {username} already exists. Changing password...')
	user.set_password(password)
	user.save()
	print('Password changed successfully')
"

exec gunicorn --bind 0.0.0.0:8080 portfolio_api.wsgi