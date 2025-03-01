# portfolio_api/projects/management/commands/import_projects.py

import json
import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from projects.models import Project, Gallery, GalleryImage
from django.conf import settings

class Command(BaseCommand):
    help = 'Import projects from JSON file'
    
    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON file containing projects')
    
    def handle(self, *args, **options):
        json_file = options['json_file']
        
        if not os.path.exists(json_file):
            self.stdout.write(self.style.ERROR(f'File {json_file} does not exist'))
            return
            
        with open(json_file, 'r') as file:
            projects_data = json.load(file)
            
        for project_data in projects_data:
            # Create or update project
            project, created = Project.objects.update_or_create(
                slug=project_data['slug'],
                defaults={
                    'title': project_data['title'],
                    'description': project_data['description'],
                    'readme': project_data.get('readme', ''),
                    'tech_stack': project_data.get('tech_stack', []),
                    'live_url': project_data.get('live_url', ''),
                    'code_url': project_data.get('code_url', ''),
                    'is_featured': project_data.get('is_featured', False),
                    'score': project_data.get('score', None),
                    'features': project_data.get('features', []),
                    'challenges': project_data.get('challenges', ''),
                    'lessons': project_data.get('lessons', '')
                }
            )
            
            action = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f'{action} project: {project.title}'))
            
            # Process galleries
            for gallery_data in project_data.get('galleries', []):
                gallery, created = Gallery.objects.update_or_create(
                    project=project,
                    name=gallery_data['name'],
                    defaults={
                        'description': gallery_data.get('description', ''),
                        'order': gallery_data.get('order', 0)
                    }
                )
                
                # Process images (placeholder paths - these will need to be replaced with actual images)
                for image_data in gallery_data.get('images', []):
                    image_path = image_data.get('image', '')
                    caption = image_data.get('caption', '')
                    order = image_data.get('order', 0)
                    
                    # Note: This is a placeholder. You'll need to load actual images
                    self.stdout.write(self.style.WARNING(
                        f'Would create image: {image_path} for gallery {gallery.name} (order: {order})'
                    ))
                    
                    # Uncomment below if you have images to import
                    image_instance = GalleryImage(
                        gallery=gallery,
                        caption=caption,
                        order=order
                    )
                    with open(os.path.join(settings.MEDIA_ROOT, image_path), 'rb') as img_file:
                        image_instance.image.save(os.path.basename(image_path), ContentFile(img_file.read()))