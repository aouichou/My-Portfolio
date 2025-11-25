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
	path('auth/terminal-token/', views.generate_terminal_token, name='terminal_token'),
	
	# Internship endpoints
	path('internships/', views.InternshipViewSet.as_view({'get': 'list'}), name='internship-list'),
	path('internships/<slug:slug>/', views.InternshipViewSet.as_view({'get': 'retrieve'}), name='internship-detail'),
	path('internships/<slug:internship_slug>/projects/', views.InternshipProjectViewSet.as_view({'get': 'list'}), name='internship-project-list'),
	path('internships/<slug:internship_slug>/projects/<slug:slug>/', views.InternshipProjectViewSet.as_view({'get': 'retrieve'}), name='internship-project-detail'),
]