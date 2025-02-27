# projects/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('v1/projects/', views.ProjectList.as_view(), name='project-list'),
    path('v1/projects/<slug:slug>/', views.ProjectDetail.as_view(), name='project-detail'),
    path('v1/contact/', views.ContactSubmissionView.as_view(), name='contact-submission'),
]