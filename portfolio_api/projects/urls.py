# projects/urls.py

from django.urls import path

from . import views

urlpatterns = [
	path('', views.api_root, name='api-root'),
    path('projects/', views.ProjectViewSet.as_view({'get': 'list'}), name='project-list'),
    path('projects/<slug:slug>/', views.ProjectDetail.as_view(), name='project-detail'),
    path('contact/', views.ContactSubmissionView.as_view(), name='contact-submission'),
	path('projects/<slug:slug>/files/', views.project_files, name='project-files'),
	path('health/', views.health_check, name='health-check'),
	path('auth/terminal-token/', views.generate_terminal_token, name='terminal_token'),

	# Experience endpoints (schema v2 — successor of the deprecated
	# /api/internships* routes, deleted with their models in F1-06; the
	# frozen v1 UI's consumption of the old routes is tracked in SESSION.md)
	path('experiences/', views.ExperienceViewSet.as_view({'get': 'list'}), name='experience-list'),
	path('experiences/<slug:slug>/', views.ExperienceViewSet.as_view({'get': 'retrieve'}), name='experience-detail'),
]