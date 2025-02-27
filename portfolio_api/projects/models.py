# projects/models.py

from django.db import models
from django.utils.text import slugify
from django.core.validators import FileExtensionValidator

class Project(models.Model):
	title = models.CharField(max_length=200)
	slug = models.SlugField(unique=True, blank=True)
	readme = models.TextField(blank=True)
	description = models.TextField()
	tech_stack = models.TextField()
	live_url = models.URLField(blank=True)
	code_url = models.URLField(blank=True)
	thumbnail = models.ImageField(upload_to='projects/')
	is_featured = models.BooleanField(default=False)
	score = models.IntegerField(null=True, blank=True)
	features = models.JSONField(default=list, help_text="List of key features")
	challenges = models.TextField(blank=True, help_text="Technical challenges overcome")
	lessons = models.TextField(blank=True, help_text="Key lessons learned")
	gallery = models.ManyToManyField(
        'ProjectImage', 
        blank=True,
        related_name='project_gallery'
    )
	video_url = models.URLField(blank=True)
	architecture_diagram = models.ImageField(upload_to='architecture/', blank=True)
	
	def save(self, *args, **kwargs):
		if not self.slug:
			self.slug = slugify(self.title)
		super().save(*args, **kwargs)

	def __str__(self):
		return self.title
	
class ContactSubmission(models.Model):
	name = models.CharField(max_length=100)
	email = models.EmailField()
	message = models.TextField()
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"Message from {self.name}"
	
class ProjectImage(models.Model):
	project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE,
        related_name='project_images'
    )
	image = models.ImageField(
        upload_to='project_gallery/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png'])]
    )
	caption = models.CharField(max_length=200, blank=True)
	order = models.PositiveIntegerField(default=0)

	class Meta:
		ordering = ['order']
		indexes = [
            models.Index(fields=['project', 'order']),
        ]