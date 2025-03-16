# portfolio_api/projects/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/terminal/(?P<project_slug>[\w-]+)/$', consumers.TerminalConsumer.as_asgi()),
    re_path(r'ws/health/$', consumers.HealthCheckConsumer.as_asgi()),
]