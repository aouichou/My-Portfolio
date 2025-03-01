# portfolio_api/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .healthcheck import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('projects.urls')),
	path('healthz', health_check),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)