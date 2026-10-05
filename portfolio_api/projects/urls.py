# projects/urls.py

from django.urls import path

from . import views

urlpatterns = [
	path('', views.api_root, name='api-root'),
    path('projects/', views.ProjectViewSet.as_view({'get': 'list'}), name='project-list'),
    path('projects/<slug:slug>/', views.ProjectViewSet.as_view({'get': 'retrieve'}), name='project-detail'),
    path('contact/', views.ContactSubmissionView.as_view(), name='contact-submission'),
	path('projects/<slug:slug>/files/', views.project_files, name='project-files'),
	# /api/health/ is KILLED (contract §7 kill-list — duplicates /healthz,
	# endpoint #2, served root-level by portfolio_api/urls.py for Render).
	path('auth/terminal-token/', views.generate_terminal_token, name='terminal_token'),

	# Experience endpoints (contract v2 §1 routes #6/#7 — successor of the
	# deprecated /api/internships* routes, deleted with their models in F1-06)
	path('experiences/', views.ExperienceViewSet.as_view({'get': 'list'}), name='experience-list'),
	path('experiences/<slug:slug>/', views.ExperienceViewSet.as_view({'get': 'retrieve'}), name='experience-detail'),
]