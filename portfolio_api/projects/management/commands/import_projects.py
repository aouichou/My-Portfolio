# portfolio_api/projects/management/commands/import_projects.py

import json
import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from projects.models import Project, Gallery, GalleryImage
from pathlib import Path

class Command(BaseCommand):
    help = 'Import projects from JSON file'
    
    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str)
        
    def handle(self, *args, **options):
        json_file = options['json_file']
        
        if not os.path.exists(json_file):
            self.stdout.write(self.style.ERROR(f'File {json_file} does not exist'))
            return
            
        with open(json_file, 'r') as f:
            projects_data = json.load(f)
            
        for project_data in projects_data:
            # Check if project exists by slug
            try:
                project = Project.objects.get(slug=project_data['slug'])
                self.stdout.write(self.style.SUCCESS(f'Updating existing project: {project.title}'))
            except Project.DoesNotExist:
                # Create new project with minimal validation
                project = Project(
                    title=project_data['title'],
                    slug=project_data['slug'],
                    description=project_data['description'],
                    tech_stack=project_data.get('tech_stack', []),
                    live_url=project_data.get('live_url', ''),
                    code_url=project_data.get('code_url', ''),
                    is_featured=project_data.get('is_featured', False),
                    features=project_data.get('features', []),
                    readme=project_data.get('readme', ''),
                    score=project_data.get('score', None),
                    challenges=project_data.get('challenges', ''),
                    lessons=project_data.get('lessons', '')
                )
                
                # Create a placeholder thumbnail if needed
                placeholder_path = os.path.join('prepopulated_media', 'placeholder.jpg')
                if os.path.exists(placeholder_path):
                    with open(placeholder_path, 'rb') as img_file:
                        project.thumbnail.save(f"{project.slug}_thumbnail.jpg", ContentFile(img_file.read()), save=False)
                else:
                    # Create an empty file - this is not ideal but prevents validation errors
                    project.thumbnail.save(f"{project.slug}_thumbnail.jpg", ContentFile(b''), save=False)
                
                # Save without validation
                project.save(bypass_validation=True)
                self.stdout.write(self.style.SUCCESS(f'Created new project: {project.title}'))
            
            # Process galleries
            for gallery_data in project_data.get('galleries', []):
                gallery, created = Gallery.objects.get_or_create(
                    project=project,
                    name=gallery_data['name'],
                    defaults={
                        'description': gallery_data.get('description', ''),
                        'order': gallery_data.get('order', 0)
                    }
                )
                
                self.stdout.write(f"{'Created' if created else 'Updated'} gallery: {gallery.name}")
                
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