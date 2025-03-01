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
        parser.add_argument('json_file', type=str)
        
    def handle(self, *args, **options):
        json_file = options['json_file']
        
        if not os.path.exists(json_file):
            self.stdout.write(self.style.ERROR(f'File {json_file} does not exist'))
            return
            
        with open(json_file, 'r') as f:
            projects_data = json.load(f)
            
        for project_data in projects_data:
            try:
                # For existing projects - update fields
                project = Project.objects.get(slug=project_data['slug'])
                project.title = project_data['title']
                project.description = project_data['description']
                project.tech_stack = project_data.get('tech_stack', [])
                project.live_url = project_data.get('live_url', '')
                project.code_url = project_data.get('code_url', '')
                project.is_featured = project_data.get('is_featured', False)
                project.features = project_data.get('features', [])
                project.readme = project_data.get('readme', '')
                project.save()
                self.stdout.write(self.style.SUCCESS(f'Updated project: {project.title}'))
            except Project.DoesNotExist:
                # For new projects - create with a placeholder thumbnail
                try:
                    # Create a simple in-memory image
                    import io
                    from PIL import Image
                    
                    # Create a small colored square image
                    img = Image.new('RGB', (100, 100), color = 'blue')
                    img_io = io.BytesIO()
                    img.save(img_io, format='JPEG')
                    img_io.seek(0)
                    
                    # Create project without validation first
                    project = Project(
                        title=project_data['title'],
                        slug=project_data['slug'],
                        description=project_data['description'],
                        tech_stack=project_data.get('tech_stack', []),
                        live_url=project_data.get('live_url', ''),
                        code_url=project_data.get('code_url', ''),
                        is_featured=project_data.get('is_featured', False),
                        features=project_data.get('features', []),
                        readme=project_data.get('readme', '')
                    )
                    
                    # Set the thumbnail
                    project.thumbnail.save(f"{project_data['slug']}_thumbnail.jpg", ContentFile(img_io.getvalue()))
                    
                    # Now save the project
                    project.save()
                    self.stdout.write(self.style.SUCCESS(f'Created new project: {project.title}'))
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error creating project: {str(e)}'))
            
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