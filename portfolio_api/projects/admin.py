# protfolio_api/projects/admin.py

from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_featured')
    list_filter = ('is_featured',)
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ('title', 'description')