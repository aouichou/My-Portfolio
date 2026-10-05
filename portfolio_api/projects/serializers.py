# portfolio_api/projects/serializers.py
"""
Schema v2 serializers (field map: docs/designs/2026-10-05-schema-v2-field-map.md).

The read-time shape-mutating validators (validate_code_snippets /
validate_code_steps) are DELETED (F1-06, map §5.3 — the double-transform
hazard): canonicalization happens at ETL/write time (F1-07), never at read
time. The serializer is a pass-through for canonical JSON content.

The deprecated-model serializers (InternshipSerializer, InternshipListSerializer,
InternshipProjectSerializer) are deleted with their models (F1-06). The F2
handoff list lives in .github/agent-reports/senior-dev/f1-06-models-v2.md.
"""

from rest_framework import serializers

from .models import (
	ContactSubmission,
	Experience,
	Gallery,
	GalleryImage,
	Project,
)


class GalleryImageSerializer(serializers.ModelSerializer):
	image_url = serializers.SerializerMethodField()

	class Meta:
		model = GalleryImage
		depth = 1
		fields = ['id', 'image', 'caption', 'order', 'image_url']

	def get_image_url(self, obj):
		request = self.context.get('request')
		return request.build_absolute_uri(obj.image.url) if obj.image else None

class GallerySerializer(serializers.ModelSerializer):
	images = GalleryImageSerializer(many=True, read_only=True)

	class Meta:
		model = Gallery
		fields = ['id', 'name', 'description', 'order', 'images']


class ProjectSerializer(serializers.ModelSerializer):
	thumbnail_url = serializers.SerializerMethodField()
	galleries = GallerySerializer(many=True, read_only=True, source='galleries.all')

	class Meta:
		model = Project
		fields = [
			'id', 'title', 'slug', 'readme', 'description', 'tech_stack',
			'live_url', 'code_url', 'thumbnail', 'is_featured', 'score',
			'features', 'challenges', 'lessons', 'video_url', 'galleries',
			'has_demo', 'demo_commands', 'architecture_description',
			'architecture_diagrams', 'related_documentation', 'thumbnail_url',
			'demo_files_path', 'code_steps', 'code_snippets', 'order',
			'project_type', 'experience', 'role_description',
			'stats', 'badges', 'impact_metrics',
			'created_at', 'updated_at',
		]
		read_only_fields = ['created_at', 'updated_at']

	def get_thumbnail_url(self, obj):
		request = self.context.get('request')
		return request.build_absolute_uri(obj.thumbnail.url) if obj.thumbnail else None


class ExperienceSerializer(serializers.ModelSerializer):
	"""Detail payload for an experience: hero content + nested linked projects."""
	projects = ProjectSerializer(many=True, read_only=True)
	period_display = serializers.SerializerMethodField()
	duration_months = serializers.SerializerMethodField()

	class Meta:
		model = Experience
		fields = [
			'id', 'company', 'role', 'subtitle', 'slug',
			'start_date', 'end_date', 'period_display', 'duration_months',
			'overview', 'stats', 'technologies', 'impact_metrics',
			'architecture_description', 'architecture_diagrams',
			'code_samples', 'documentation', 'projects',
			'is_active', 'order', 'created_at', 'updated_at',
		]
		read_only_fields = ['created_at', 'updated_at']

	def get_period_display(self, obj):
		"""Format period as 'May 2025 - Nov 2025' or 'May 2025 - Present'."""
		start = obj.start_date.strftime('%b %Y')
		end = obj.end_date.strftime('%b %Y') if obj.end_date else 'Present'
		return f"{start} - {end}"

	def get_duration_months(self, obj):
		"""Duration in whole months (counting the start month)."""
		from datetime import date
		end = obj.end_date if obj.end_date else date.today()
		months = (end.year - obj.start_date.year) * 12 + (end.month - obj.start_date.month) + 1
		return months


class ExperienceListSerializer(serializers.ModelSerializer):
	"""Lightweight serializer for experience listings (no nested projects)."""
	period_display = serializers.SerializerMethodField()
	project_count = serializers.SerializerMethodField()

	class Meta:
		model = Experience
		fields = [
			'id', 'company', 'role', 'subtitle', 'slug',
			'start_date', 'end_date', 'period_display',
			'overview', 'stats', 'project_count',
			'is_active', 'order',
		]

	def get_period_display(self, obj):
		start = obj.start_date.strftime('%b %Y')
		end = obj.end_date.strftime('%b %Y') if obj.end_date else 'Present'
		return f"{start} - {end}"

	def get_project_count(self, obj):
		return obj.projects.count()


class ContactSubmissionSerializer(serializers.ModelSerializer):
	class Meta:
		model = ContactSubmission
		fields = ['name', 'email', 'message']
