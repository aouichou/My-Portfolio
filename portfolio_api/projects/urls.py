# projects/urls.py

from django.urls import path
from . import views

urlpatterns = [
	path('', views.debug_view, name='debug'),
    path('projects/', views.ProjectViewSet.as_view({'get': 'list'}), name='project-list'),
    path('projects/<slug:slug>/', views.ProjectDetail.as_view(), name='project-detail'),
    path('contact/', views.ContactSubmissionView.as_view(), name='contact-submission'),
	path('projects/<slug:slug>/files/', views.project_files, name='project-files'),
	path('import-data/', views.trigger_import),
	path('health/', views.health_check, name='health-check'),
]