# projects/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('projects/', views.ProjectList.as_view(), name='project-list'),
    path('projects/<slug:slug>/', views.ProjectDetail.as_view(), name='project-detail'),
    path('contact/', views.ContactSubmissionView.as_view(), name='contact-submission'),
]