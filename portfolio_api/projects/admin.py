# portfolio_api/projects/admin.py

from django.contrib import admin
from .models import Project, Gallery, GalleryImage, ContactSubmission
from django import forms

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

class ProjectAdminForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = '__all__'
        widgets = {
            'features': forms.Textarea(attrs={
                'placeholder': '''[
    {"text": "Feature 1", "completionPercentage": 75},
    {"text": "Feature 2", "completionPercentage": 50}
]'''
            }),
            'architecture_diagram': forms.Textarea(attrs={
                'rows': 10,
                'style': 'font-family: monospace;',
                'placeholder': '''flowchart TD
    A[Client] --> B[Server]
    B --> C[Database]'''
            }),
            'diagram_type': forms.RadioSelect()
        }

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    form = ProjectAdminForm
    list_display = ('title', 'is_featured', 'score')
    list_filter = ('is_featured', 'diagram_type')
    prepopulated_fields = {'slug': ('title',)}
    search_fields = ('title', 'description')
    inlines = [GalleryInline]
    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'thumbnail', 'description', 'is_featured', 'score')
        }),
        ('Project Details', {
            'fields': ('readme', 'tech_stack', 'features', 'challenges', 'lessons')
        }),
        ('URLs', {
            'fields': ('live_url', 'code_url', 'video_url')
        }),
        ('Architecture Diagram', {
            'fields': ('diagram_type', 'architecture_diagram'),
            'classes': ('wide',)
        }),
    )

@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at')
    search_fields = ('name', 'email', 'message')
    readonly_fields = ('created_at',)

# Register additional models
admin.site.register(Gallery, GalleryAdmin)