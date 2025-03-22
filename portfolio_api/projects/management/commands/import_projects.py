# portfolio_api/projects/management/commands/import_projects.py

import json
import os
import requests
from pathlib import Path
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from projects.models import Project, Gallery, GalleryImage
from django.conf import settings
from tqdm import tqdm  # For progress bars
import boto3
from botocore.exceptions import NoCredentialsError

class Command(BaseCommand):
    help = 'Import projects from JSON file'

    def add_arguments(self, parser):
        parser.add_argument('json_file', help='Path to JSON file containing projects')
        parser.add_argument('--media-dir', help='Path to media directory containing project assets')
        parser.add_argument('--update', action='store_true', help='Update existing projects')
        parser.add_argument('--skip-images', action='store_true', help='Skip image uploads')
        parser.add_argument('--skip-existing', action='store_true', help='Skip existing projects')

    def handle(self, *args, **options):
        json_file = options['json_file']
        media_dir = options.get('media_dir')
        update = options.get('update', False)
        skip_images = options.get('skip_images', False)
        skip_existing = options.get('skip_existing', False)

        self.stdout.write(f"Importing projects from {json_file}")
        
        try:
            with open(json_file, 'r') as f:
                projects_data = json.load(f)
        except FileNotFoundError:
            self.stderr.write(f"File {json_file} not found")
            return
        except json.JSONDecodeError:
            self.stderr.write(f"Invalid JSON in {json_file}")
            return

        # Initialize S3 client
        s3_client = None
        if not skip_images and settings.DEFAULT_FILE_STORAGE.endswith('S3Storage'):
            try:
                s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=settings.AWS_S3_REGION_NAME
                )
            except Exception as e:
                self.stderr.write(f"Error connecting to S3: {e}")
        
        # Process each project
        for project_data in tqdm(projects_data, desc="Processing projects"):
            slug = project_data.get('slug')
            if not slug:
                self.stderr.write(f"Project missing slug: {project_data.get('title')}")
                continue
                
            # Check if project exists
            existing = Project.objects.filter(slug=slug).first()
            if existing:
                if skip_existing:
                    self.stdout.write(f"Skipping existing project: {slug}")
                    continue
                elif update:
                    self.stdout.write(f"Updating existing project: {slug}")
                    project = existing
                else:
                    self.stderr.write(f"Project with slug {slug} already exists. Use --update to update.")
                    continue
            else:
                project = Project(slug=slug)
                self.stdout.write(f"Creating new project: {slug}")
            
            # Update basic fields
            for field in ['title', 'description', 'readme', 'is_featured', 'score',
                         'tech_stack', 'features', 'challenges', 'lessons',
                         'live_url', 'code_url', 'video_url', 'diagram_type',
                         'architecture_diagram', 'has_interactive_demo', 
                         'demo_commands', 'demo_files_path', 'code_steps', 'code_snippets']:
                if field in project_data:
                    setattr(project, field, project_data[field])
            
            # Handle thumbnail
            if 'thumbnail' in project_data and not skip_images:
                self._process_image(project, 'thumbnail', project_data['thumbnail'], media_dir, s3_client)
            
            # Save project with validation bypass for initial save
            try:
                project.save(bypass_validation=True)
                self.stdout.write(f"Saved project: {slug}")
            except Exception as e:
                self.stderr.write(f"Error saving project {slug}: {e}")
                continue
            
            # Process galleries
            if 'galleries' in project_data and not skip_images:
                self._process_galleries(project, project_data['galleries'], media_dir, s3_client)
                
            self.stdout.write(f"Completed import for: {slug}")
        
        self.stdout.write(self.style.SUCCESS(f"Successfully imported {len(projects_data)} projects"))

    def _process_image(self, obj, field_name, image_path, media_dir, s3_client):
        """Process and save an image to the model field"""
        try:
            if media_dir and os.path.exists(os.path.join(media_dir, image_path)):
                # Local file
                with open(os.path.join(media_dir, image_path), 'rb') as img_file:
                    getattr(obj, field_name).save(os.path.basename(image_path), ContentFile(img_file.read()), save=False)
            elif image_path.startswith(('http://', 'https://')):
                # Remote URL
                response = requests.get(image_path)
                if response.status_code == 200:
                    getattr(obj, field_name).save(os.path.basename(image_path), ContentFile(response.content), save=False)
            elif s3_client:
                # Check if already in S3
                try:
                    s3_client.head_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=image_path)
                    setattr(obj, field_name, image_path)  # Image already exists in S3
                except:
                    self.stderr.write(f"Image not found in S3: {image_path}")
        except Exception as e:
            self.stderr.write(f"Error processing image {image_path}: {e}")

    def _process_galleries(self, project, galleries_data, media_dir, s3_client):
        """Process and save galleries and their images"""
        # Delete existing galleries if we're updating
        Gallery.objects.filter(project=project).delete()
        
        for gallery_data in galleries_data:
            gallery = Gallery(
                project=project,
                name=gallery_data.get('name', 'Unnamed Gallery'),
                description=gallery_data.get('description', ''),
                order=gallery_data.get('order', 0)
            )
            gallery.save()
            
            # Process gallery images
            if 'images' in gallery_data:
                for image_data in gallery_data['images']:
                    gallery_image = GalleryImage(
                        gallery=gallery,
                        caption=image_data.get('caption', ''),
                        order=image_data.get('order', 0)
                    )
                    
                    if 'image' in image_data:
                        self._process_image(gallery_image, 'image', image_data['image'], media_dir, s3_client)
                        gallery_image.save()