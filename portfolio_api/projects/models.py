# portfolio_api/projects/models.py
"""
Schema v2 models (field map: docs/designs/2026-10-05-schema-v2-field-map.md).

- Project: the unified table (school | internship | personal), formalized demo
  block, rescued rich-content fields, canonical JSON (NOT NULL, list defaults).
- Experience: thin grouping table replacing the deprecated Internship twin —
  experience-level truth (company/role/dates/hero content) lives once here and
  Projects point at it via a nullable PROTECT FK.
- The deprecated Internship/InternshipProject twins are GONE (F1-06); their
  prod content is rescued by the F1-07 etl_v2 command before 0012 drops the
  tables (migration 0011 adds, 0012 drops — flip-window order, map §5.10).
"""

from django.core.exceptions import ValidationError
from django.core.validators import (
	FileExtensionValidator,
	MaxValueValidator,
	MinValueValidator,
)
from django.db import models
from django.utils.text import slugify


class Experience(models.Model):
	"""
	Experience-level grouping (replaces the deprecated Internship model).

	Holds the shared truth for a professional experience — company, role,
	dates, hero stats/technologies/impact, architecture prose, code samples,
	documentation — so linked internship Projects don't triplicate it.
	"""

	# Basic Information
	company = models.CharField(max_length=255, help_text="Company name (e.g. 'Qynapse')")
	role = models.CharField(max_length=255, help_text="Role/position title")
	subtitle = models.CharField(max_length=500, help_text="Hero one-liner for the experience section")
	slug = models.SlugField(unique=True, max_length=100, help_text="URL slug (keys the F5-04 redirects)")

	# Period
	start_date = models.DateField(help_text="Start date")
	end_date = models.DateField(
		blank=True, null=True, help_text="End date (null = current)"
	)

	# Overview Content
	overview = models.TextField(help_text="Long-form overview of the experience")

	# Hero content — canonical shapes per field map §3.4
	stats = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"label": str, "value": str}]',
	)
	technologies = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"name": str, "category"?: str}]',
	)
	impact_metrics = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"label": str, "value": str, "description"?: str}]',
	)

	# Architecture
	architecture_description = models.TextField(
		blank=True, null=True, help_text="Architecture prose (e.g. the ZTA layers)"
	)
	architecture_diagrams = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"title": str, "type": str, "content": str, "description"?: str}]',
	)

	# Code & docs — canonical shapes per field map §3.4
	code_samples = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"title": str, "description"?: str, "language"?: str, "code": str, "category"?: str}]',
	)
	documentation = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"title": str, "description"?: str, "category"?: str}]',
	)

	# Display Settings
	is_active = models.BooleanField(default=True, help_text="Display toggle")
	order = models.PositiveIntegerField(default=0, help_text="Display order (lower first)")

	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['order', '-start_date']
		indexes = [
			models.Index(fields=['is_active', 'order'], name='experience_active_order_idx'),
		]

	def save(self, *args, **kwargs):
		# Auto-generate slug if missing
		if not self.slug:
			self.slug = slugify(self.company)

		# Handle duplicate slugs
		counter = 1
		original_slug = self.slug
		while Experience.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
			self.slug = f"{original_slug}-{counter}"
			counter += 1

		super().save(*args, **kwargs)

	def clean(self):
		super().clean()
		if (
			self.end_date is not None
			and self.start_date is not None
			and self.end_date < self.start_date
		):
			raise ValidationError("End date must be after start date")

	def __str__(self):
		return f"{self.role} @ {self.company}"


class Project(models.Model):
	PROJECT_TYPE_CHOICES = [
		('school', 'School Project'),
		('internship', 'Internship Project'),
		('personal', 'Personal Project'),
	]
	DIAGRAM_TYPE_CHOICES = ['mermaid', 'flowchart', 'custom']

	# Project Type & Classification — no default: a conscious admin choice (map §3.1)
	project_type = models.CharField(
		max_length=20,
		choices=PROJECT_TYPE_CHOICES,
		help_text="Type of project: school, internship or personal",
	)

	# Grouping link — experience-level truth lives on Experience (map §2.1/§2.2)
	experience = models.ForeignKey(
		Experience,
		on_delete=models.PROTECT,
		null=True,
		blank=True,
		related_name='projects',
		help_text="Linked experience (internship projects); PROTECT prevents orphaning",
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
		help_text="Project thumbnail image (required when featured)",
	)
	thumbnail_url = models.URLField(blank=True, null=True, help_text="External thumbnail URL (escape hatch)")
	is_featured = models.BooleanField(default=False)
	score = models.IntegerField(
		null=True,
		blank=True,
		default=None,
		validators=[MinValueValidator(0), MaxValueValidator(125)],
		help_text="School-context score (0-125); null when not applicable (internship/personal)",
	)
	readme = models.TextField(blank=True, null=True, help_text="Single long-form body (Markdown)")
	tech_stack = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"name": str, "category"?: str}]',
	)
	features = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [str] — plain feature strings',
	)
	challenges = models.TextField(blank=True, null=True)
	lessons = models.TextField(blank=True, null=True)
	live_url = models.URLField(blank=True, null=True)
	code_url = models.URLField(blank=True, null=True)
	video_url = models.URLField(blank=True, null=True)

	# Architecture (rescued from InternshipProject, map §2.1/§2.3)
	architecture_description = models.TextField(blank=True, null=True)
	architecture_diagrams = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"title": str, "type": str, "content": str, "description"?: str}] — type in mermaid|flowchart|custom',
	)
	related_documentation = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"title": str, "description"?: str, "category"?: str}]',
	)

	# Demo block (formalized, map §2.1) — feeds the Phase 4 DB-driven whitelist
	has_demo = models.BooleanField(default=False, help_text="Whether this project has an interactive terminal demo")
	demo_commands = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"label": str, "command": str}]',
	)
	demo_files_path = models.CharField(
		blank=True, null=True, max_length=255,
		help_text="R2 key of the demo zip (under project-files/)",
	)

	# Code walkthrough (rescued shapes, map §2.1/§3.4)
	code_steps = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [str] — ordered steps',
	)
	code_snippets = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"title"?: str, "description"?: str, "language"?: str, "code": str}]',
	)

	# Internship-project content that is genuinely project-level
	role_description = models.TextField(
		blank=True, null=True,
		help_text="Your specific role and contributions on this project",
	)
	stats = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"label": str, "value": str}]',
	)
	badges = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"text": str}] — color/variant keys are gone (brief §2.5)',
	)
	impact_metrics = models.JSONField(
		default=list, blank=True,
		help_text='Canonical: [{"label": str, "value": str, "description"?: str}]',
	)

	# Ledger ordering (map §3.5)
	order = models.PositiveIntegerField(default=0, help_text="Ledger ordering (lower first)")

	# Provenance timestamps (map §2.1)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def save(self, *args, **kwargs):
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
		super().clean()
		# Thumbnail required IFF featured (map §3.3)
		if self.is_featured and not self.thumbnail:
			raise ValidationError("Thumbnail is required")

		if not self.slug:
			self.slug = slugify(self.title)

		if Project.objects.filter(slug=self.slug).exclude(pk=self.pk).exists():
			raise ValidationError("Slug must be unique")

		# Soft integrity rule (map §3.3): internship => experience set
		if self.project_type == 'internship' and self.experience_id is None:
			raise ValidationError("Internship projects must link an experience")

	class Meta:
		ordering = ['order', 'title']
		indexes = [
			models.Index(fields=['project_type', 'order'], name='project_type_order_idx'),
			models.Index(
				fields=['has_demo'],
				condition=models.Q(has_demo=True),
				name='project_demo_idx',
			),
		]
		constraints = [
			models.CheckConstraint(
				condition=models.Q(project_type__in=['school', 'internship', 'personal']),
				name='project_type_valid',
			),
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
