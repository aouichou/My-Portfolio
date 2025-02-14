# projects/models.py

from django.db import models
from django.utils.text import slugify

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