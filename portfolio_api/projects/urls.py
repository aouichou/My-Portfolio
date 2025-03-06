# projects/urls.py

from django.urls import path
from . import views

urlpatterns = [
	path('', views.debug_view, name='debug'),
    path('projects/', views.ProjectList.as_view(), name='project-list'),
    path('projects/<slug:slug>/', views.ProjectDetail.as_view(), name='project-detail'),
    path('contact/', views.ContactSubmissionView.as_view(), name='contact-submission'),
	path('api/import-data/', views.trigger_import),
]