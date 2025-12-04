# portfolio_api/projects/admin.py

from django import forms
from django.contrib import admin
from django.core.files.storage import default_storage

from .models import (
	ContactSubmission,
	Gallery,
	GalleryImage,
	Internship,
	InternshipProject,
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
			'diagram_type': forms.RadioSelect(),
			'demo_commands': forms.Textarea(attrs={
				'rows': 15,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''{
  "ls": "README.md\\nMakefile\\nsrc/\\nincludes/\\nproject",
  "cat README.md": "# Project Title\\n\\nProject description here\\n\\n## Usage\\n./project [args]",
  "make": "Compiling...\\n[####################] 100%\\nCompilation successful!",
  "run": "Running project...\\nProject output here"
}'''
			}),
			'code_steps': forms.Textarea(attrs={
				'rows': 15,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''{
  "Initialize Project": "import { createApp } from 'vue'\\nimport App from './App.vue'\\n\\nconst app = createApp(App)\\napp.mount('#app')",
  "Setup Routes": "const routes = [\\n  { path: '/', component: Home },\\n  { path: '/about', component: About }\\n]\\n\\nconst router = createRouter({\\n  history: createWebHistory(),\\n  routes\\n})"
}'''
			}),
			'code_snippets': forms.Textarea(attrs={
				'rows': 15,
				'style': 'font-family: monospace; font-size: 12px;',
				'placeholder': '''{
  "Terminal Client": "const socket = new WebSocket(`wss://api.aouichou.me/ws/terminal/${slug}/`);\\n\\nsocket.onmessage = (event) => {\\n  const data = JSON.parse(event.data);\\n  if (data.output) {\\n    term.write(data.output);\\n  }\\n};\\n\\nterm.onData((input) => {\\n  socket.send(JSON.stringify({ input }));\\n});"
}'''
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
					print(f"Deleted existing file: {instance.demo_files_path}")
				except Exception as e:
					print(f"Error deleting existing file: {e}")
	
			file_path = f'project-files/{instance.slug}.zip'
			
			# Save the file using default_storage (local in dev, S3 in prod)
			s3_path = default_storage.save(file_path, demo_files)
			
			# Store the path
			instance.demo_files_path = s3_path
		
		if commit:
			instance.save()
		
		return instance
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
	form = ProjectAdminForm
	list_display = ('title', 'is_featured', 'score', 'has_interactive_demo')
	list_filter = ('is_featured', 'diagram_type', 'has_interactive_demo')
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
		('Code Examples', {
			'fields': ('code_steps', 'code_snippets'),
			'classes': ('wide',),
			'description': 'Add code walkthrough steps and key code snippets to highlight in the project detail page.'
		}),
		('Interactive Terminal Demo', {
			'fields': ('has_interactive_demo', 'demo_commands', 'demo_files'),
			'classes': ('wide',),
			'description': 'Configure the interactive terminal demo for this project. The demo commands should be a JSON object where keys are commands and values are their outputs.'
		}),
	)

@admin.register(ContactSubmission)
class ContactSubmissionAdmin(admin.ModelAdmin):
	list_display = ('name', 'email', 'created_at')
	search_fields = ('name', 'email', 'message')
	readonly_fields = ('created_at',)

# Register additional models
admin.site.register(Gallery, GalleryAdmin)


# ============ Internship Admin Configuration ============

class InternshipProjectInline(admin.TabularInline):
	"""Inline editor for internship projects"""
	model = InternshipProject
	extra = 1
	fields = ('title', 'slug', 'order', 'is_featured')
	prepopulated_fields = {'slug': ('title',)}
	show_change_link = True


@admin.register(Internship)
class InternshipAdmin(admin.ModelAdmin):
	"""Admin interface for Internship model"""
	list_display = ('company', 'role', 'start_date', 'end_date', 'is_active', 'order')
	list_filter = ('is_active', 'start_date')
	prepopulated_fields = {'slug': ('company',)}
	search_fields = ('company', 'role', 'subtitle', 'overview')
	inlines = [InternshipProjectInline]
	
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
			'description': 'JSON array: [{"value": "10,000+", "label": "Lines of Code", "color": "blue"}, ...]'
		}),
		('Technologies', {
			'fields': ('technologies',),
			'classes': ('wide',),
			'description': 'JSON array: [{"name": "FastAPI", "icon": "⚡", "category": "backend", "level": 5}, ...]'
		}),
		('Impact Metrics', {
			'fields': ('impact_metrics',),
			'classes': ('wide',),
			'description': 'JSON array: [{"value": "10000", "label": "Lines of Code", "description": "...", "icon": "💻"}, ...]'
		}),
		('Architecture', {
			'fields': ('architecture_description', 'architecture_diagram'),
			'classes': ('wide',)
		}),
		('Code Samples', {
			'fields': ('code_samples',),
			'classes': ('wide',),
			'description': 'JSON array: [{"title": "...", "description": "...", "code": "...", "language": "python"}, ...]'
		}),
		('Documentation', {
			'fields': ('documentation',),
			'classes': ('wide',),
			'description': 'JSON array: [{"title": "...", "description": "...", "category": "architecture", "icon": "📄"}, ...]'
		}),
		('Display Settings', {
			'fields': ('is_active', 'order')
		}),
	)


@admin.register(InternshipProject)
class InternshipProjectAdmin(admin.ModelAdmin):
	"""Admin interface for InternshipProject model"""
	list_display = ('title', 'internship', 'order', 'is_featured')
	list_filter = ('internship', 'is_featured')
	prepopulated_fields = {'slug': ('title',)}
	search_fields = ('title', 'description', 'overview')
	
	fieldsets = (
		('Basic Information', {
			'fields': ('internship', 'title', 'slug', 'description')
		}),
		('Visual', {
			'fields': ('thumbnail', 'thumbnail_url')
		}),
		('Project Details', {
			'fields': ('overview', 'role_description'),
			'classes': ('wide',)
		}),
		('Technologies & Stats', {
			'fields': ('tech_stack', 'stats', 'badges'),
			'classes': ('wide',),
			'description': 'tech_stack: ["FastAPI", ...], stats: {"ownership": "80%", ...}, badges: [{"text": "...", "variant": "primary"}, ...]'
		}),
		('Architecture', {
			'fields': ('architecture_description', 'architecture_diagrams'),
			'classes': ('wide',),
			'description': 'architecture_diagrams: [{"title": "...", "diagram": "mermaid code", "description": "..."}, ...]'
		}),
		('Key Features', {
			'fields': ('key_features',),
			'classes': ('wide',),
			'description': 'JSON array: [{"title": "...", "description": "...", "icon": "🔐"}, ...]'
		}),
		('Code Snippets', {
			'fields': ('code_snippets',),
			'classes': ('wide',),
			'description': 'JSON array: [{"title": "...", "code": "...", "language": "python", "description": "..."}, ...]'
		}),
		('Impact & Documentation', {
			'fields': ('impact_metrics', 'related_documentation'),
			'classes': ('wide',)
		}),
		('Display Settings', {
			'fields': ('order', 'is_featured')
		}),
	)