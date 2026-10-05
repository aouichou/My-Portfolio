# portfolio_api/projects/admin.py
"""
Schema v2 admin (field map §3.6).

- ProjectAdmin: v2 list_display/list_filter, demo block grouped, rich-content
  block grouped, experience FK surfaced (audit finding: v1 fieldsets omitted
  the internship fields entirely).
- ExperienceAdmin: full fieldsets + read-only view of linked projects
  (linked projects are edited on their own rows — Project FK points here).
- The deprecated Internship/InternshipProject admins die with the models.
"""

from django import forms
from django.contrib import admin
from django.core.files.storage import default_storage

from .models import (
	ContactSubmission,
	Experience,
	Gallery,
	GalleryImage,
	Project,
)


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
	demo_files = forms.FileField(
		required=False,
		help_text="Upload a zip file containing project demo files",
		widget=forms.ClearableFileInput(attrs={'accept': '.zip'})
	)

	class Meta:
		model = Project
		fields = '__all__'
		widgets = {
			'tech_stack': forms.Textarea(attrs={
				'rows': 8,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[
	{"name": "C", "category": "language"},
	{"name": "Make"}
]'''
			}),
			'features': forms.Textarea(attrs={
				'rows': 8,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[
	"Parsing",
	"Execution"
]'''
			}),
			'architecture_diagrams': forms.Textarea(attrs={
				'rows': 10,
				'style': 'font-family: monospace;',
				'placeholder': '''[
	{
		"title": "Architecture",
		"type": "mermaid",
		"content": "flowchart TD\\n\\tA[Client] --> B[Server]\\n\\tB --> C[Database]",
		"description": "optional"
	}
]'''
			}),
			'demo_commands': forms.Textarea(attrs={
				'rows': 10,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[
	{"label": "Build", "command": "make"},
	{"label": "Run", "command": "./project"}
]'''
			}),
			'code_steps': forms.Textarea(attrs={
				'rows': 8,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[
	"make re",
	"./minishell"
]'''
			}),
			'code_snippets': forms.Textarea(attrs={
				'rows': 10,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[
	{
		"title": "Terminal client",
		"description": "optional",
		"language": "typescript",
		"code": "const socket = new WebSocket(url);"
	}
]'''
			}),
			'related_documentation': forms.Textarea(attrs={
				'rows': 6,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[
	{"title": "Runbook", "description": "optional", "category": "architecture"}
]'''
			}),
			'stats': forms.Textarea(attrs={
				'rows': 4,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[{"label": "Coverage", "value": "85%"}]'''
			}),
			'badges': forms.Textarea(attrs={
				'rows': 4,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[{"text": "Zero Trust"}]'''
			}),
			'impact_metrics': forms.Textarea(attrs={
				'rows': 4,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''[{"label": "Vulns prevented", "value": "15+", "description": "optional"}]'''
			}),
		}

	def save(self, commit=True):
		instance = super().save(commit=False)

		# Handle demo files upload
		demo_files = self.cleaned_data.get('demo_files')
		if demo_files:
			# Generate a path like 'project-files/project-slug.zip'

			if instance.demo_files_path:
				try:
					# Use default_storage which respects DEBUG setting
					default_storage.delete(instance.demo_files_path)
				except Exception as e:
					# Non-fatal: the stale R2 key may already be gone; the
					# upload below still replaces the stored path.
					import logging
					logging.getLogger(__name__).warning(
						"Could not delete stale demo file %s: %s",
						instance.demo_files_path, e,
					)

			file_path = f'project-files/{instance.slug}.zip'

			# Save the file using default_storage (local in dev, S3 in prod)
			s3_path = default_storage.save(file_path, demo_files)

			# Store the path
			instance.demo_files_path = s3_path

		if commit:
			instance.save()

		return instance


class ExperienceProjectInline(admin.TabularInline):
	"""Read-only view of the projects linked to this Experience (map §3.6).

	Editing happens on the Project rows (the FK points here) — PROTECT makes
	casual unlinking impossible, so the admin only shows the relationship.
	"""
	model = Project
	extra = 0
	max_num = 0
	can_delete = False
	verbose_name_plural = 'Linked projects (edit on their own rows)'
	fields = ('title', 'slug', 'project_type', 'order', 'has_demo', 'is_featured')
	readonly_fields = fields

	def has_add_permission(self, request, obj=None):
		return False


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
	form = ProjectAdminForm
	list_display = ('title', 'project_type', 'order', 'has_demo', 'is_featured')
	list_filter = ('project_type', 'has_demo', 'is_featured')
	prepopulated_fields = {'slug': ('title',)}
	search_fields = ('title', 'description')
	inlines = [GalleryInline]
	fieldsets = (
		(None, {
			'fields': ('title', 'slug', 'project_type', 'experience', 'thumbnail', 'description', 'is_featured', 'score', 'order')
		}),
		('Project Details', {
			'fields': ('readme', 'tech_stack', 'features', 'challenges', 'lessons')
		}),
		('URLs', {
			'fields': ('live_url', 'code_url', 'video_url')
		}),
		('Architecture', {
			'fields': ('architecture_description', 'architecture_diagrams', 'related_documentation'),
			'classes': ('wide',),
			'description': (
				'Canonical shapes (field map §3.4): '
				'architecture_diagrams = [{title, type, content, description?}], '
				'related_documentation = [{title, description?, category?}] — '
				'WARNING: the 3 internship rows hold rescued placeholder content '
				'("...") pending real documentation (F1-07) — replace here'
			),
		}),
		('Code Examples', {
			'fields': ('code_steps', 'code_snippets'),
			'classes': ('wide',),
			'description': 'Canonical shapes (field map §3.4): code_steps = [str], code_snippets = [{title?, description?, language?, code}]'
		}),
		('Interactive Terminal Demo', {
			'fields': ('has_demo', 'demo_commands', 'demo_files_path', 'demo_files'),
			'classes': ('wide',),
			'description': (
				'Canonical shape (field map §3.4): demo_commands = [{"label": str, "command": str}]. '
				'has_demo feeds the Phase 4 DB-driven terminal whitelist — every row currently '
				'stored False; curate deliberately.'
			),
		}),
		('Internship Content', {
			'fields': ('role_description', 'stats', 'badges', 'impact_metrics'),
			'classes': ('wide',),
			'description': 'Project-level internship content (company/role/dates live on the linked Experience)'
		}),
	)


@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
	"""Admin for the thin experience grouping table (map §3.6)."""
	list_display = ('company', 'role', 'start_date', 'end_date', 'is_active', 'order')
	list_filter = ('is_active', 'start_date')
	prepopulated_fields = {'slug': ('company',)}
	search_fields = ('company', 'role', 'subtitle', 'overview')
	inlines = [ExperienceProjectInline]

	fieldsets = (
		('Basic Information', {
			'fields': ('company', 'role', 'subtitle', 'slug', 'start_date', 'end_date')
		}),
		('Overview Content', {
			'fields': ('overview',),
			'classes': ('wide',)
		}),
		('Hero Stats', {
			'fields': ('stats',),
			'classes': ('wide',),
			'description': 'Canonical: [{"label": str, "value": str}]'
		}),
		('Technologies', {
			'fields': ('technologies',),
			'classes': ('wide',),
			'description': 'Canonical: [{"name": str, "category"?: str}]'
		}),
		('Impact Metrics', {
			'fields': ('impact_metrics',),
			'classes': ('wide',),
			'description': 'Canonical: [{"label": str, "value": str, "description"?: str}]'
		}),
		('Architecture', {
			'fields': ('architecture_description', 'architecture_diagrams'),
			'classes': ('wide',),
			'description': 'architecture_diagrams canonical: [{"title": str, "type": str, "content": str, "description"?: str}]'
		}),
		('Code Samples', {
			'fields': ('code_samples',),
			'classes': ('wide',),
			'description': 'Canonical: [{"title": str, "description"?: str, "language"?: str, "code": str, "category"?: str}]'
		}),
		('Documentation', {
			'fields': ('documentation',),
			'classes': ('wide',),
			'description': 'Canonical: [{"title": str, "description"?: str, "category"?: str}]'
		}),
		('Display Settings', {
			'fields': ('is_active', 'order')
		}),
	)

@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
	list_display = ('name', 'email', 'created_at')
	search_fields = ('name', 'email', 'message')
	readonly_fields = ('created_at',)

# Register additional models
admin.site.register(Gallery, GalleryAdmin)
