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

# Start gunicorn in background for HTTP
gunicorn --bind 0.0.0.0:8080 portfolio_api.wsgi &
GUNICORN_PID=$!

# Start daphne for WebSockets
daphne -b 0.0.0.0 -p 8081 portfolio_api.asgi:application &
DAPHNE_PID=$!

# Forward signals to both processes
trap "kill $GUNICORN_PID $DAPHNE_PID" SIGINT SIGTERM

# Wait for either process to exit
wait