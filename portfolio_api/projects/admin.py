# portfolio_api/projects/admin.py

from django.contrib import admin
from .models import Project, Gallery, GalleryImage, ContactSubmission

class GalleryImageInline(admin.TabularInline):
    model = GalleryImage
    extra = 3

class GalleryAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'order')
    list_filter = ('project',)
    inlines = [GalleryImageInline]

class GalleryInline(admin.TabularInline):
    model = Gallery
    extra = 1

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_featured', 'score')
    list_filter = ('is_featured',)
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ('title', 'description')
    inlines = [GalleryInline]

@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at')
    search_fields = ('name', 'email', 'message')
    readonly_fields = ('created_at',)

# Register additional models
admin.site.register(Gallery, GalleryAdmin)