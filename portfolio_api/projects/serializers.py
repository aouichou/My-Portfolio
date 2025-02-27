# projects/serializers.py

from rest_framework import serializers
from .models import ContactSubmission
from .models import Project, ProjectImage

class ProjectImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProjectImage
        fields = ['image', 'caption', 'order']

    def get_image(self, obj):
        request = self.context.get('request')
        return request.build_absolute_uri(obj.image.url) if obj.image else None

class ProjectSerializer(serializers.ModelSerializer):
    thumbnail = serializers.SerializerMethodField()
    gallery = ProjectImageSerializer(
        many=True, 
        read_only=True,
        source='project_gallery'
    )
    tech_stack = serializers.JSONField()

    class Meta:
        model = Project
        fields = ['id', 'title', 'slug', 'description', 'thumbnail', 
                 'tech_stack', 'live_url', 'code_url', 'readme', 'score',
                 'features', 'challenges', 'lessons', 'gallery', 
                 'video_url', 'architecture_diagram', 'is_featured']
        extra_kwargs = {
            'tech_stack': {'allow_null': False},
            'features': {'allow_null': False}
        }

    def validate_tech_stack(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Tech stack must be a list of strings")
        return value

class ContactSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactSubmission
        fields = ['name', 'email', 'message']

