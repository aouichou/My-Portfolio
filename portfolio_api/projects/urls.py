# projects/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('projects/', views.ProjectList.as_view(), name='project-list'),
    path('projects/<slug:slug>/', views.ProjectDetail.as_view(), name='project-detail'),
    path('projects/post-slug/', views.project_by_slug, name='project-by-slug'),
    path('contact/', views.ContactSubmissionView.as_view(), name='contact-submission'),
]