# portfolio_api/projects/management/commands/import_projects.py

import json
import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from projects.models import Project, Gallery, GalleryImage
from django.conf import settings

class Command(BaseCommand):
	help = 'Import projects from JSON file'
	
	def add_arguments(self, parser):
		parser.add_argument('json_file', type=str)
		
	def handle(self, *args, **options):
		json_file = options['json_file']
		
		media_root = settings.MEDIA_ROOT
		if not os.path.exists(media_root):
			os.makedirs(media_root, exist_ok=True)

		if not os.path.exists(json_file):
			self.stdout.write(self.style.ERROR(f'File {json_file} does not exist'))
			return
			
		with open(json_file, 'r') as f:
			try:
				projects_data = json.load(f)
			except json.JSONDecodeError as e:
				self.stdout.write(self.style.ERROR(f'Invalid JSON: {str(e)}'))
				return
			
		for project_data in projects_data:
			try:
				# Validate required fields
				if 'slug' not in project_data or 'title' not in project_data:
					raise ValidationError("Project missing slug or title")

				# Update existing or create new project
				project, created = Project.objects.update_or_create(
					slug=project_data['slug'],
					defaults={
						'title': project_data['title'],
						'description': project_data['description'],
						'tech_stack': project_data.get('tech_stack', []),
						'live_url': project_data.get('live_url', ''),
						'code_url': project_data.get('code_url', ''),
						'is_featured': project_data.get('is_featured', False),
						'features': project_data.get('features', []),
						'readme': project_data.get('readme', ''),
						'score': project_data.get('score', 0)
					}
				)

				# Create placeholder thumbnail if new project
				if created:
					try:
						from PIL import Image
						import io
						
						img = Image.new('RGB', (100, 100), color='blue')
						img_io = io.BytesIO()
						img.save(img_io, format='JPEG')
						img_io.seek(0)
						
						project.thumbnail.save(
							f"{project_data['slug']}_thumbnail.jpg", 
							ContentFile(img_io.getvalue()),
							save=False
						)
						project.save(bypass_validation=True)
						
					except Exception as e:
						self.stdout.write(self.style.ERROR(f'Thumbnail creation failed: {str(e)}'))
						project.delete()
						continue

				# Process galleries
				for gallery_data in project_data.get('galleries', []):
					try:
						if 'name' not in gallery_data or not gallery_data['name'].strip():
							self.stdout.write(self.style.WARNING(
	   						 f"Skipping gallery with missing name in project {project.slug}"
   							 ))
							continue
							
						gallery, g_created = Gallery.objects.update_or_create(
							project=project,
							name=gallery_data['name'],
							defaults={
								'description': gallery_data.get('description', ''),
								'order': gallery_data.get('order', 0)
							}
						)
						
						# Process images
						for image_data in gallery_data.get('images', []):
							try:
								if 'image' not in image_data:
									raise ValidationError("Image field missing")
									
								image_path = os.path.join(settings.MEDIA_ROOT, image_data['image'])
								if not os.path.exists(image_path):
									self.stdout.write(self.style.WARNING(
										f'Skipping missing image: {image_data["image"]}'
									))
									continue
									
								with open(image_path, 'rb') as img_file:
									GalleryImage.objects.update_or_create(
										gallery=gallery,
										order=image_data.get('order', 0),
										defaults={
											'caption': image_data.get('caption', ''),
											'image': ContentFile(
												img_file.read(),
												name=os.path.basename(image_path)
											)
										}
									)
									
							except Exception as e:
								self.stdout.write(self.style.ERROR(
									f'Image processing failed: {str(e)}'
								))
								continue
								
					except Exception as e:
						self.stdout.write(self.style.ERROR(
							f'Gallery processing failed: {str(e)}'
						))
						continue
						
			except Exception as e:
				self.stdout.write(self.style.ERROR(
					f'Project processing failed: {str(e)}'
				))
				continue