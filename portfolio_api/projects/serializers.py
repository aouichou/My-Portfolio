# portfolio_api/projects/serializers.py
"""
Contract v2 serializers (frozen: docs/designs/2026-10-05-api-contract-v2.md §3).

Pass-through only — canonicalization happens at ETL/write time (F1-06 killed
the read-time shape-mutating validators; they stay dead). The serializer
surface is the contract's §3 JSON examples verbatim:

- ProjectCardSerializer    §3.1  — 9-field card (list items + nested projects)
- ProjectSerializer        §3.3  — 31-field detail (slug identity; no ids, no
                                    raw storage paths; light experience ref)
- ExperienceListSerializer §3.4  — light list row (overview is detail-only)
- ExperienceSerializer     §3.5  — hero detail + nested ProjectCards

thumbnail_url (contract §2.2 frozen fix): absolute URL of the uploaded
thumbnail when set, ELSE the model's external thumbnail_url escape hatch,
else null — the method field must not shadow the model field.
"""

from rest_framework import serializers

from .models import (
	ContactSubmission,
	Experience,
	Gallery,
	GalleryImage,
	Project,
)


def _thumbnail_url(obj, request):
	"""Contract §2.2: uploaded file → absolute URL; else the model's external
	thumbnail_url escape hatch; else None."""
	if obj.thumbnail:
		url = obj.thumbnail.url
		return request.build_absolute_uri(url) if request else url
	return obj.thumbnail_url


def _period_display(obj):
	"""'May 2025 - Nov 2025' / 'May 2025 - Present' (contract §3.4)."""
	start = obj.start_date.strftime('%b %Y')
	end = obj.end_date.strftime('%b %Y') if obj.end_date else 'Present'
	return f"{start} - {end}"


def _duration_months(obj):
	"""Contract §2.3: inclusive (ey−sy)×12 + (em−sm) + 1; recomputed against
	oday when end_date is null."""
	from datetime import date
	end = obj.end_date if obj.end_date else date.today()
	return (end.year - obj.start_date.year) * 12 + (end.month - obj.start_date.month) + 1


class GalleryImageSerializer(serializers.ModelSerializer):
	image_url = serializers.SerializerMethodField()

	class Meta:
		model = GalleryImage
		fields = ['caption', 'order', 'image_url']

	def get_image_url(self, obj):
		request = self.context.get('request')
		if not obj.image:
			return None
		url = obj.image.url
		return request.build_absolute_uri(url) if request else url

class GallerySerializer(serializers.ModelSerializer):
	images = GalleryImageSerializer(many=True, read_only=True)

	class Meta:
		model = Gallery
		fields = ['name', 'description', 'order', 'images']


class ProjectCardSerializer(serializers.ModelSerializer):
	"""Contract §3.1 — the 9-field ledger card."""
	thumbnail_url = serializers.SerializerMethodField()

	class Meta:
		model = Project
		fields = [
			'slug', 'title', 'project_type', 'description', 'is_featured',
			'has_demo', 'thumbnail_url', 'tech_stack', 'order',
		]

	def get_thumbnail_url(self, obj):
		return _thumbnail_url(obj, self.context.get('request'))


class ExperienceRefSerializer(serializers.ModelSerializer):
	"""Contract §3.3 — the light experience ref nested in ProjectDetail
	(or null when the project is unlinked)."""
	period_display = serializers.SerializerMethodField()

	class Meta:
		model = Experience
		fields = ['slug', 'company', 'role', 'period_display']

	def get_period_display(self, obj):
		return _period_display(obj)


class ProjectSerializer(serializers.ModelSerializer):
	"""Contract §3.3 — ProjectDetail (31 fields; slug is the identity)."""
	thumbnail_url = serializers.SerializerMethodField()
	galleries = GallerySerializer(many=True, read_only=True, source='galleries.all')
	experience = ExperienceRefSerializer(read_only=True)

	class Meta:
		model = Project
		fields = [
			'slug', 'title', 'project_type', 'description', 'readme',
			'thumbnail_url', 'is_featured', 'score', 'tech_stack', 'features',
			'challenges', 'lessons', 'live_url', 'code_url', 'video_url',
			'role_description', 'stats', 'badges', 'impact_metrics',
			'architecture_description', 'architecture_diagrams',
			'related_documentation', 'code_steps', 'code_snippets', 'has_demo',
			'demo_commands', 'demo_files_path', 'galleries', 'experience',
			'order', 'created_at', 'updated_at',
		]
		read_only_fields = ['created_at', 'updated_at']

	def get_thumbnail_url(self, obj):
		return _thumbnail_url(obj, self.context.get('request'))


class ExperienceSerializer(serializers.ModelSerializer):
	"""Contract §3.5 — hero detail: everything in §3.4 plus the long-form
	block and nested projects as ProjectCards (one card shape everywhere)."""
	projects = ProjectCardSerializer(many=True, read_only=True)
	period_display = serializers.SerializerMethodField()
	duration_months = serializers.SerializerMethodField()
	project_count = serializers.SerializerMethodField()

	class Meta:
		model = Experience
		fields = [
			'slug', 'company', 'role', 'subtitle', 'start_date', 'end_date',
			'period_display', 'stats', 'project_count', 'is_active', 'order',
			'overview', 'technologies', 'impact_metrics',
			'architecture_description', 'architecture_diagrams', 'code_samples',
			'documentation', 'duration_months', 'projects',
			'created_at', 'updated_at',
		]
		read_only_fields = ['created_at', 'updated_at']

	def get_period_display(self, obj):
		return _period_display(obj)

	def get_duration_months(self, obj):
		return _duration_months(obj)

	def get_project_count(self, obj):
		return obj.projects.count()


class ExperienceListSerializer(serializers.ModelSerializer):
	"""Contract §3.4 — light list row (overview is detail-only)."""
	period_display = serializers.SerializerMethodField()
	project_count = serializers.SerializerMethodField()

	class Meta:
		model = Experience
		fields = [
			'slug', 'company', 'role', 'subtitle', 'start_date', 'end_date',
			'period_display', 'stats', 'project_count', 'is_active', 'order',
		]

	def get_period_display(self, obj):
		return _period_display(obj)

	def get_project_count(self, obj):
		return obj.projects.count()


class ContactSubmissionSerializer(serializers.ModelSerializer):
	class Meta:
		model = ContactSubmission
		fields = ['name', 'email', 'message']
