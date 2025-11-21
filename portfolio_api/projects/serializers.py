# portfolio_api/projects/serializers.py

from rest_framework import serializers

from .models import (
	ContactSubmission,
	Gallery,
	GalleryImage,
	Internship,
	InternshipProject,
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

def validate_code_steps(data):
	"""Validate code steps have the expected structure"""
	if not isinstance(data, dict):
		return {}
	
	# If data has a single key '0' containing another object, unwrap it
	if '0' in data and len(data) == 1 and isinstance(data['0'], dict):
		data = data['0']
	
	result = {}
	for key, value in data.items():
		# Ensure each step value is a string
		if isinstance(value, (dict, list)):
			result[key] = str(value) 
		else:
			result[key] = str(value)
			
	return result

def validate_code_snippets(data):
	"""Validate code snippets have the expected structure"""
	if not isinstance(data, dict):
		return {}
		
	result = {}
	for key, value in data.items():
		if isinstance(value, str):
			# Old format - convert to new format
			result[key] = {
				"code": value,
				"title": key.replace('_', ' ').title(),
				"description": f"Implementation of {key.replace('_', ' ')}",
				"explanation": "",
				"language": "c"
			}
		elif isinstance(value, dict) and "code" in value:
			# New format - ensure all fields exist
			result[key] = {
				"code": value.get("code", ""),
				"title": value.get("title", key.replace('_', ' ').title()),
				"description": value.get("description", ""),
				"explanation": value.get("explanation", ""),
				"language": value.get("language", "c")
			}
	
	return result

class ProjectSerializer(serializers.ModelSerializer):
	thumbnail_url = serializers.SerializerMethodField()
	galleries = GallerySerializer(many=True, read_only=True, source='galleries.all')
	tech_stack = serializers.JSONField()
	code_steps = serializers.JSONField()
	code_snippets = serializers.JSONField()
	stats = serializers.JSONField(required=False)
	badges = serializers.JSONField(required=False)
	impact_metrics = serializers.JSONField(required=False)
	
	class Meta:
		model = Project
		fields = [
			'id', 'title', 'slug', 'readme', 'description', 'tech_stack', 
			'live_url', 'code_url', 'thumbnail', 'is_featured', 'score',
			'features', 'challenges', 'lessons', 'video_url', 'galleries',
			'has_interactive_demo', 'demo_commands', 'architecture_diagram', 
			'diagram_type', 'thumbnail_url', 'demo_files_path', 'code_steps',
			'code_snippets',
			# New internship fields
			'project_type', 'company', 'role', 'start_date', 'end_date',
			'stats', 'badges', 'role_description', 'impact_metrics'
		]
		extra_kwargs = {
			'architecture_diagram': {'write_only': True}
		}
	
	def get_thumbnail_url(self, obj):
		request = self.context.get('request')
		return request.build_absolute_uri(obj.thumbnail.url) if obj.thumbnail else None

	def validate_code_snippets(self, data):
		return validate_code_snippets(data)

	def validate_code_steps(self, data):
		return validate_code_steps(data)

class ContactSubmissionSerializer(serializers.ModelSerializer):
	class Meta:
		model = ContactSubmission
		fields = ['name', 'email', 'message']


class InternshipProjectSerializer(serializers.ModelSerializer):
	"""
	Serializer for individual internship projects
	Used for both card display and detail pages
	"""
	thumbnail_url = serializers.SerializerMethodField()
	internship_company = serializers.CharField(source='internship.company', read_only=True)
	
	class Meta:
		model = InternshipProject
		fields = [
			'id',
			'title',
			'slug',
			'description',
			'thumbnail',
			'thumbnail_url',
			'overview',
			'role_description',
			'tech_stack',
			'stats',
			'badges',
			'architecture_description',
			'architecture_diagrams',
			'key_features',
			'code_snippets',
			'impact_metrics',
			'related_documentation',
			'order',
			'is_featured',
			'internship_company',
		]
	
	def get_thumbnail_url(self, obj):
		"""Return absolute URL for thumbnail if available"""
		if obj.thumbnail:
			request = self.context.get('request')
			return request.build_absolute_uri(obj.thumbnail.url) if request else obj.thumbnail.url
		return obj.thumbnail_url


class InternshipSerializer(serializers.ModelSerializer):
	"""
	Serializer for internship overview
	Includes nested projects for the landing page
	"""
	projects = InternshipProjectSerializer(many=True, read_only=True)
	period_display = serializers.SerializerMethodField()
	duration_months = serializers.SerializerMethodField()
	
	class Meta:
		model = Internship
		fields = [
			'id',
			'company',
			'role',
			'subtitle',
			'slug',
			'start_date',
			'end_date',
			'period_display',
			'duration_months',
			'overview',
			'stats',
			'technologies',
			'impact_metrics',
			'architecture_description',
			'architecture_diagram',
			'code_samples',
			'documentation',
			'projects',
			'is_active',
			'order',
		]
	
	def get_period_display(self, obj):
		"""Format period as 'May 2025 - Nov 2025' or 'May 2025 - Present'"""
		start = obj.start_date.strftime('%b %Y')
		if obj.end_date:
			end = obj.end_date.strftime('%b %Y')
		else:
			end = 'Present'
		return f"{start} - {end}"
	
	def get_duration_months(self, obj):
		"""Calculate duration in months"""
		from datetime import date
		end = obj.end_date if obj.end_date else date.today()
		months = (end.year - obj.start_date.year) * 12 + (end.month - obj.start_date.month)
		return months


class InternshipListSerializer(serializers.ModelSerializer):
	"""
	Lightweight serializer for internship list (without nested projects)
	Used for homepage banner or listing pages
	"""
	period_display = serializers.SerializerMethodField()
	project_count = serializers.SerializerMethodField()
	
	class Meta:
		model = Internship
		fields = [
			'id',
			'company',
			'role',
			'subtitle',
			'slug',
			'start_date',
			'end_date',
			'period_display',
			'overview',
			'stats',
			'project_count',
			'is_active',
			'order',
		]
	
	def get_period_display(self, obj):
		"""Format period as 'May 2025 - Nov 2025'"""
		start = obj.start_date.strftime('%b %Y')
		if obj.end_date:
			end = obj.end_date.strftime('%b %Y')
		else:
			end = 'Present'
		return f"{start} - {end}"
	
	def get_project_count(self, obj):
		"""Return number of projects in this internship"""
		return obj.projects.count()