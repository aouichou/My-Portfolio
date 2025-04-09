# portfolio_api/projects/management/commands/import_projects.py

import os
import boto3
import logging
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.conf import settings
from projects.models import Project, Gallery, GalleryImage

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Restore missing media files to S3 from local directory'

    def add_arguments(self, parser):
        parser.add_argument('media_dir', help='Path to media directory containing project assets')
        parser.add_argument('--dry-run', action='store_true', help='Check what would be uploaded without making changes')
        parser.add_argument('--only-galleries', action='store_true', help='Only update gallery images, skip thumbnails')
        parser.add_argument('--include-dir', help='Only process files in this subdirectory (e.g. galleries/2025/03/)')

    def handle(self, *args, **options):
        media_dir = options['media_dir']
        dry_run = options.get('dry_run', False)
        only_galleries = options.get('only_galleries', False)
        include_dir = options.get('include_dir', '')
        
        if not os.path.exists(media_dir):
            self.stderr.write(f"Media directory not found: {media_dir}")
            return
        
        # Initialize S3 client for checking file existence
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        
        self.stdout.write(f"Checking/restoring media files from {media_dir}")
        self.stdout.write(f"S3 bucket: {bucket_name}")
        
        # Process thumbnail for each project
        if not only_galleries:
            self._restore_thumbnails(media_dir, s3_client, bucket_name, dry_run)
        
        # Process gallery images
        self._restore_gallery_images(media_dir, s3_client, bucket_name, dry_run, include_dir)
            
        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry run completed. No files were modified."))
        else:
            self.stdout.write(self.style.SUCCESS("Media restoration completed."))

    def _restore_thumbnails(self, media_dir, s3_client, bucket_name, dry_run):
        """Restore missing thumbnail images"""
        projects = Project.objects.all()
        self.stdout.write(f"Checking {projects.count()} project thumbnails...")
        
        for project in projects:
            if project.thumbnail and str(project.thumbnail).strip():
                thumbnail_path = str(project.thumbnail)
                s3_key = thumbnail_path
                
                # Check if thumbnail exists in S3
                try:
                    s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                    self.stdout.write(f"✓ Thumbnail exists in S3: {s3_key}")
                except Exception as e:
                    # Thumbnail doesn't exist in S3, try to upload it
                    self.stdout.write(f"✗ Thumbnail missing from S3: {s3_key}")
                    
                    local_path = os.path.join(media_dir, thumbnail_path)
                    if os.path.exists(local_path):
                        if not dry_run:
                            try:
                                with open(local_path, 'rb') as img_file:
                                    project.thumbnail.save(
                                        os.path.basename(thumbnail_path),
                                        ContentFile(img_file.read()),
                                        save=True
                                    )
                                self.stdout.write(self.style.SUCCESS(f"  ✓ Restored thumbnail from {local_path}"))
                            except Exception as upload_error:
                                self.stderr.write(f"  ✗ Failed to upload {local_path}: {upload_error}")
                        else:
                            self.stdout.write(f"  ✓ Would restore thumbnail from {local_path} (dry run)")
                    else:
                        self.stderr.write(f"  ✗ Local file not found: {local_path}")

    def _restore_gallery_images(self, media_dir, s3_client, bucket_name, dry_run, include_dir):
        """Restore missing gallery images"""
        galleries = Gallery.objects.all().prefetch_related('images')
        self.stdout.write(f"Checking gallery images for {galleries.count()} galleries...")
        
        image_count = 0
        restored_count = 0
        
        for gallery in galleries:
            for image in gallery.images.all():
                image_count += 1
                if not image.image:
                    continue
                    
                image_path = str(image.image)
                
                # Skip if not in the included directory
                if include_dir and include_dir not in image_path:
                    continue
                
                s3_key = image_path
                
                # Check if image exists in S3
                try:
                    s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                    self.stdout.write(f"✓ Gallery image exists in S3: {s3_key}")
                except Exception:
                    # Image doesn't exist in S3, try to upload it
                    self.stdout.write(f"✗ Gallery image missing from S3: {s3_key}")
                    
                    local_path = os.path.join(media_dir, image_path)
                    if os.path.exists(local_path):
                        if not dry_run:
                            try:
                                with open(local_path, 'rb') as img_file:
                                    image.image.save(
                                        os.path.basename(image_path),
                                        ContentFile(img_file.read()),
                                        save=True
                                    )
                                self.stdout.write(self.style.SUCCESS(f"  ✓ Restored image from {local_path}"))
                                restored_count += 1
                            except Exception as upload_error:
                                self.stderr.write(f"  ✗ Failed to upload {local_path}: {upload_error}")
                        else:
                            self.stdout.write(f"  ✓ Would restore image from {local_path} (dry run)")
                            restored_count += 1
                    else:
                        self.stderr.write(f"  ✗ Local file not found: {local_path}")
        
        self.stdout.write(f"Processed {image_count} gallery images, would restore {restored_count}")