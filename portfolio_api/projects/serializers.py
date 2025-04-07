# portfolio_api/projects/serializers.py

from rest_framework import serializers
from .models import Project, Gallery, GalleryImage, ContactSubmission

class GalleryImageSerializer(serializers.ModelSerializer):
	image_url = serializers.SerializerMethodField()
	
	class Meta:
		model = GalleryImage
		depth = 1
		fields = ['id', 'image', 'caption', 'order', 'image_url']
	
	def get_image_url(self, obj):
		request = self.context.get('request')
		try:
			if obj.image and hasattr(obj.image, 'url'):
				return request.build_absolute_uri(obj.image.url)
		except ValueError:
			# Image exists in DB but file is missing
			return None
		return None

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
	
	class Meta:
		model = Project
		fields = [
			'id', 'title', 'slug', 'readme', 'description', 'tech_stack', 
			'live_url', 'code_url', 'thumbnail', 'is_featured', 'score',
			'features', 'challenges', 'lessons', 'video_url', 'galleries',
			'has_interactive_demo', 'demo_commands', 'architecture_diagram', 
			'diagram_type', 'thumbnail_url', 'demo_files_path', 'code_steps',
			'code_snippets'
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