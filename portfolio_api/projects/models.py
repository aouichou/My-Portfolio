# portfolio_api/projects/models.py

from django.db import models
from django.utils.text import slugify
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError

class Project(models.Model):
	title = models.CharField(max_length=200)
	slug = models.SlugField(unique=True, blank=True)
	readme = models.TextField(blank=True)
	description = models.TextField()
	tech_stack = models.JSONField(default=list)
	live_url = models.URLField(blank=True)
	code_url = models.URLField(blank=True)
	thumbnail = models.ImageField(upload_to='projects/')
	is_featured = models.BooleanField(default=False)
	score = models.IntegerField(null=True, blank=True)
	features = models.JSONField(default=list, help_text="List of key features")
	challenges = models.TextField(blank=True, help_text="Technical challenges overcome")
	lessons = models.TextField(blank=True, help_text="Key lessons learned")
	video_url = models.URLField(blank=True)
	architecture_diagram = models.ImageField(upload_to='architecture/', blank=True)
	
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

	# def save(self, *args, **kwargs):
	# 	self.full_clean()
	# 	super().save(*args, **kwargs)

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
	name = models.CharField(max_length=200)
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