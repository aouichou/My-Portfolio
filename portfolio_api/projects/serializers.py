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
		return request.build_absolute_uri(obj.image.url) if obj.image else None

class GallerySerializer(serializers.ModelSerializer):
	images = GalleryImageSerializer(many=True, read_only=True)
	
	class Meta:
		model = Gallery
		fields = ['id', 'name', 'description', 'order', 'images']

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

class ContactSubmissionSerializer(serializers.ModelSerializer):
	class Meta:
		model = ContactSubmission
		fields = ['name', 'email', 'message']