# portfolio_api/projects/models.py

from django.db import models
from django.utils.text import slugify
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from .storage import CustomS3Storage
from django.core.validators import MinValueValidator, MaxValueValidator

s3_storage = CustomS3Storage()

class Project(models.Model):
	DIAGRAM_CHOICES = [
		('mermaid', 'Mermaid.js'),
		('flowchart', 'Flowchart.js'),
		('custom', 'Custom SVG/Image')
	]
	
	title = models.CharField(max_length=255)
	slug = models.SlugField(unique=True, max_length=100)
	description = models.TextField()
	thumbnail = models.ImageField(
		upload_to='projects/',
		storage=s3_storage,
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
		storage=s3_storage,
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