# portfolio_api/projects/models.py

from django.core.exceptions import ValidationError
from django.core.validators import (
	FileExtensionValidator,
	MaxValueValidator,
	MinValueValidator,
)
from django.db import models
from django.utils.text import slugify


class Project(models.Model):
	PROJECT_TYPE_CHOICES = [
		('school', 'School Project'),
		('internship', 'Internship Project'),
	]
	
	DIAGRAM_CHOICES = [
		('mermaid', 'Mermaid.js'),
		('flowchart', 'Flowchart.js'),
		('custom', 'Custom SVG/Image')
	]
	
	# Project Type & Classification
	project_type = models.CharField(
		max_length=20,
		choices=PROJECT_TYPE_CHOICES,
		default='school',
		help_text="Type of project: school or internship"
	)
	
	# Basic Information
	title = models.CharField(max_length=255)
	slug = models.SlugField(unique=True, max_length=100)
	description = models.TextField()
	thumbnail = models.ImageField(
		upload_to='projects/',
		validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])],
		blank=True, 
		null=True,
		help_text="Project thumbnail image"
	)
	thumbnail_url = models.URLField(blank=True, null=True, help_text="Alternative URL for thumbnail")
	is_featured = models.BooleanField(default=False)
	score = models.IntegerField(
		validators=[MinValueValidator(0), MaxValueValidator(125)],
		default=0,
		help_text="Project score (0-125)"
	)
	readme = models.TextField(blank=True, null=True, help_text="Full README content in Markdown format")
	tech_stack = models.JSONField(blank=True, null=True, help_text="List of technologies used in the project")
	features = models.JSONField(blank=True, null=True, help_text="List of project features with completion percentages")
	challenges = models.TextField(blank=True, null=True, help_text="Challenges faced during development")
	lessons = models.TextField(blank=True, null=True, help_text="Lessons learned from the project")
	live_url = models.URLField(blank=True, null=True, help_text="Link to live demo")
	code_url = models.URLField(blank=True, null=True, help_text="Link to source code")
	video_url = models.URLField(blank=True, null=True, help_text="Link to project video demonstration")
	diagram_type = models.CharField(
		max_length=20,
		choices=DIAGRAM_CHOICES,
		default='mermaid',
		help_text="Type of architecture diagram"
	)
	architecture_diagram = models.TextField(blank=True, null=True, help_text="Architecture diagram code (for Mermaid/Flowchart) or image URL")
	has_interactive_demo = models.BooleanField(default=False, help_text="Whether this project has an interactive terminal demo")
	demo_commands = models.JSONField(blank=True, null=True, help_text="Demo commands for interactive terminal")
	demo_files_path = models.CharField(blank=True, null=True, max_length=255, help_text="Path to demo files in S3")
	
	code_steps = models.JSONField(blank=True, null=True, help_text="List of steps to run the code")
	code_snippets = models.JSONField(blank=True, null=True, help_text="List of code snippets")
	
	# Internship-specific fields
	company = models.CharField(
		max_length=255,
		blank=True,
		null=True,
		help_text="Company name (for internship projects)"
	)
	role = models.CharField(
		max_length=255,
		blank=True,
		null=True,
		help_text="Role/position (for internship projects)"
	)
	start_date = models.DateField(
		blank=True,
		null=True,
		help_text="Project start date (for internship projects)"
	)
	end_date = models.DateField(
		blank=True,
		null=True,
		help_text="Project end date (for internship projects)"
	)
	stats = models.JSONField(
		blank=True,
		null=True,
		help_text='Project stats: {"coverage": "85%", "endpoints": "15+", ...}'
	)
	badges = models.JSONField(
		blank=True,
		null=True,
		help_text='Badges: [{"text": "Zero Trust", "color": "blue"}, ...]'
	)
	role_description = models.TextField(
		blank=True,
		null=True,
		help_text="Your specific role and contributions (for internship projects)"
	)
	impact_metrics = models.JSONField(
		blank=True,
		null=True,
		help_text='Impact metrics: {"security_vulnerabilities_prevented": "15+", ...}'
	)
	
	def save(self, *args, **kwargs):
		# Allow bypassing validation for initial imports
		bypass_validation = kwargs.pop('bypass_validation', False)
		
		if not bypass_validation:
			self.full_clean()
			
		# Auto-generate slug if missing
		if not self.slug:
			self.slug = slugify(self.title)
			
		# Handle duplicate slugs
		counter = 1
		original_slug = self.slug
		while Project.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
			self.slug = f"{original_slug}-{counter}"
			counter += 1
			
		super().save(*args, **kwargs)

	def clean(self):
		if not self.thumbnail:
			raise ValidationError("Thumbnail is required")
		if not self.slug:
			self.slug = slugify(self.title)
			
		if Project.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
			raise ValidationError("Slug must be unique")

	class Meta:
		ordering = ['-is_featured', 'title']
		indexes = [
			models.Index(fields=['slug'], name='project_slug_idx'),
		]

	def __str__(self):
		return self.title

class Gallery(models.Model):
	"""Gallery for organizing images within a project"""
	project = models.ForeignKey(
		Project, 
		on_delete=models.CASCADE,
		related_name='galleries'
	)
	name = models.CharField(max_length=200, default='Unnamed Gallery')
	description = models.TextField(blank=True)
	order = models.PositiveIntegerField(default=0)
	
	class Meta:
		verbose_name_plural = "Galleries"
		ordering = ['order']
		indexes = [
			models.Index(fields=['project', 'order'], name='gallery_order_idx'),
		]
		
	def __str__(self):
		return f"{self.name} - {self.project.title}"

class GalleryImage(models.Model):
	"""Images belonging to a gallery"""
	gallery = models.ForeignKey(
		Gallery, 
		on_delete=models.CASCADE,
		related_name='images'
	)
	image = models.ImageField(
		upload_to='galleries/%Y/%m/%d/',
		validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])]
	)
	caption = models.CharField(max_length=200, blank=True)
	order = models.PositiveIntegerField(default=0)
	
	class Meta:
		ordering = ['order']
		indexes = [
			models.Index(fields=['gallery', 'order'], name='image_order_idx'),
		]
		
	def __str__(self):
		return f"Image {self.order} of {self.gallery}"

class ContactSubmission(models.Model):
	name = models.CharField(max_length=100)
	email = models.EmailField()
	message = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"Message from {self.name}"


class Internship(models.Model):
	"""
	DEPRECATED: This model is deprecated in favor of unified Project model with project_type='internship'.
	Use Project model with project_type='internship' for new internship projects.
	This model will be removed in a future release.
	
	Model for internship/professional experience showcase
	Supports the /internship landing page with overview, stats, and projects
	"""
	# Basic Information
	company = models.CharField(max_length=255, help_text="Company name (e.g., 'Qynapse Healthcare')")
	role = models.CharField(max_length=255, help_text="Role/position title")
	subtitle = models.CharField(max_length=500, help_text="Role description/subtitle for hero section")
	slug = models.SlugField(unique=True, max_length=100, help_text="URL slug (auto-generated from company)")
	
	# Period
	start_date = models.DateField(help_text="Internship start date")
	end_date = models.DateField(blank=True, null=True, help_text="Internship end date (null if current)")
	
	# Overview Content
	overview = models.TextField(help_text="Overview paragraph describing the experience")
	
	# Hero Stats (displayed on landing page)
	stats = models.JSONField(
		default=list,
		help_text='Hero stats as JSON array: [{"value": "10,000+", "label": "Lines of Code", "color": "blue"}, ...]'
	)
	
	# Technologies (for TechStackFilter component)
	technologies = models.JSONField(
		default=list,
		help_text='Technologies array: [{"name": "FastAPI", "icon": "⚡", "category": "backend", "level": 5}, ...]'
	)
	
	# Impact Metrics (for ImpactMetrics component)
	impact_metrics = models.JSONField(
		default=list,
		help_text='Impact metrics: [{"value": "10000", "label": "Lines of Code", "description": "...", "icon": "💻"}, ...]'
	)
	
	# Architecture Content
	architecture_description = models.TextField(
		blank=True,
		null=True,
		help_text="Description of the architecture/technical approach"
	)
	architecture_diagram = models.TextField(
		blank=True,
		null=True,
		help_text="Mermaid diagram code or SVG for Zero Trust architecture"
	)
	
	# Code Samples (for CodeShowcase component)
	code_samples = models.JSONField(
		default=list,
		help_text='Code samples: [{"title": "...", "description": "...", "code": "...", "language": "python"}, ...]'
	)
	
	# Documentation (for DocumentationGallery)
	documentation = models.JSONField(
		default=list,
		help_text='Documentation items: [{"title": "...", "description": "...", "category": "architecture", "icon": "📄"}, ...]'
	)
	
	# Display Settings
	is_active = models.BooleanField(
		default=True,
		help_text="Whether this internship should be displayed on the site"
	)
	order = models.PositiveIntegerField(
		default=0,
		help_text="Display order (lower numbers appear first)"
	)
	
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	class Meta:
		ordering = ['order', '-start_date']
		indexes = [
			models.Index(fields=['slug'], name='internship_slug_idx'),
			models.Index(fields=['is_active', 'order'], name='internship_active_order_idx'),
		]
	
	def save(self, *args, **kwargs):
		# Auto-generate slug if missing
		if not self.slug:
			self.slug = slugify(self.company)
		
		# Handle duplicate slugs
		counter = 1
		original_slug = self.slug
		while Internship.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
			self.slug = f"{original_slug}-{counter}"
			counter += 1
		
		super().save(*args, **kwargs)
	
	def __str__(self):
		return f"{self.role} @ {self.company}"


class InternshipProject(models.Model):
	"""
	Individual projects within an internship
	Displayed as cards on /internship and detailed pages at /internship/[slug]
	"""
	internship = models.ForeignKey(
		Internship,
		on_delete=models.CASCADE,
		related_name='projects'
	)
	
	# Basic Information
	title = models.CharField(max_length=255, help_text="Project title")
	slug = models.SlugField(max_length=100, help_text="URL slug for project detail page")
	description = models.TextField(help_text="Short description for project card")
	
	# Visual
	thumbnail = models.ImageField(
		upload_to='internship/projects/',
		validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif', 'svg'])],
		blank=True,
		null=True,
		help_text="Project thumbnail (architecture diagram or screenshot)"
	)
	thumbnail_url = models.URLField(
		blank=True,
		null=True,
		help_text="Alternative URL for thumbnail"
	)
	
	# Project Details (for detail page)
	overview = models.TextField(
		blank=True,
		null=True,
		help_text="Detailed overview for project detail page"
	)
	role_description = models.TextField(
		blank=True,
		null=True,
		help_text="Your specific role and contributions"
	)
	
	# Technologies
	tech_stack = models.JSONField(
		default=list,
		help_text='Technologies used: ["FastAPI", "PostgreSQL", "Docker", ...]'
	)
	
	# Stats (displayed on project card)
	stats = models.JSONField(
		default=dict,
		help_text='Project stats: {"ownership": "80%", "linesOfCode": "10,000+", "adoption": "Company-wide"}'
	)
	
	# Badges (for card display)
	badges = models.JSONField(
		default=list,
		help_text='Badges: [{"text": "Primary Project", "variant": "primary"}, ...]'
	)
	
	# Architecture & Implementation
	architecture_description = models.TextField(
		blank=True,
		null=True,
		help_text="Architecture explanation for detail page"
	)
	architecture_diagrams = models.JSONField(
		default=list,
		help_text='Architecture diagrams: [{"title": "...", "diagram": "mermaid code or URL", "description": "..."}, ...]'
	)
	
	# Key Features/Achievements
	key_features = models.JSONField(
		default=list,
		help_text='Key features: [{"title": "...", "description": "...", "icon": "🔐"}, ...]'
	)
	
	# Code Walkthrough (reuses CodeWalkthrough component)
	code_snippets = models.JSONField(
		default=list,
		help_text='Code examples: [{"title": "...", "code": "...", "language": "python", "description": "..."}, ...]'
	)
	
	# Impact Metrics (project-specific)
	impact_metrics = models.JSONField(
		default=list,
		help_text='Impact metrics specific to this project'
	)
	
	# Related Documentation
	related_documentation = models.JSONField(
		default=list,
		help_text='Related docs: [{"title": "...", "description": "...", "category": "...", "icon": "..."}, ...]'
	)
	
	# Display Settings
	order = models.PositiveIntegerField(
		default=0,
		help_text="Display order within internship"
	)
	is_featured = models.BooleanField(
		default=False,
		help_text="Whether to feature this project prominently"
	)
	
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)
	
	class Meta:
		ordering = ['order', 'title']
		unique_together = [['internship', 'slug']]
		indexes = [
			models.Index(fields=['internship', 'slug'], name='int_project_slug_idx'),
			models.Index(fields=['internship', 'order'], name='int_project_order_idx'),
		]
	
	def save(self, *args, **kwargs):
		# Auto-generate slug if missing
		if not self.slug:
			self.slug = slugify(self.title)
		
		# Handle duplicate slugs within the same internship
		counter = 1
		original_slug = self.slug
		while InternshipProject.objects.filter(
			internship=self.internship,
			slug=self.slug
		).exclude(pk=self.pk).exists():
			self.slug = f"{original_slug}-{counter}"
			counter += 1
		
		super().save(*args, **kwargs)
	
	def __str__(self):
		return f"{self.title} ({self.internship.company})"