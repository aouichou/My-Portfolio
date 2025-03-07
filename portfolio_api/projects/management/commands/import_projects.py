# portfolio_api/projects/management/commands/import_projects.py

import json
import os
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
from projects.models import Project, Gallery, GalleryImage
from django.conf import settings
from PIL import Image
import io

class Command(BaseCommand):
	help = 'Import projects from JSON file'
	
	def add_arguments(self, parser):
		parser.add_argument('json_file', type=str)
		
	def handle(self, *args, **options):
		self.stdout.write(self.style.NOTICE(f'MEDIA_ROOT is set to: {settings.MEDIA_ROOT}'))

		# List all files in media directory to debug
		self.stdout.write("Files in MEDIA_ROOT:")
		for root, dirs, files in os.walk(settings.MEDIA_ROOT):
			level = root.replace(settings.MEDIA_ROOT, '').count(os.sep)
			indent = ' ' * 4 * level
			self.stdout.write(f"{indent}{os.path.basename(root)}/")
			sub_indent = ' ' * 4 * (level + 1)
			for f in files:
				self.stdout.write(f"{sub_indent}{f}")
		
		# List prepopulated media if it exists
		prepop_path = "/app/prepopulated_media"
		if os.path.exists(prepop_path):
			self.stdout.write("Files in prepopulated_media:")
			for root, dirs, files in os.walk(prepop_path):
				level = root.replace(prepop_path, '').count(os.sep)
				indent = ' ' * 4 * level
				self.stdout.write(f"{indent}{os.path.basename(root)}/")
				sub_indent = ' ' * 4 * (level + 1)
				for f in files:
					self.stdout.write(f"{sub_indent}{f}")

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
				if 'thumbnail' in project_data and project_data['thumbnail']:
					
					thumbnail_path = os.path.join(settings.MEDIA_ROOT, project_data['thumbnail'])
					if os.path.exists(thumbnail_path):
						try:
							with open(thumbnail_path, 'rb') as img_file:
								# Use django's ContentFile to handle the image file
								file_content = ContentFile(img_file.read())
								# Save the thumbnail to the project
								project.thumbnail.save(
									os.path.basename(thumbnail_path),  # Just the filename part
									file_content,
									save=True  # Save the project right away
								)
								self.stdout.write(self.style.SUCCESS(
									f"Successfully set thumbnail for {project.slug}"
								))
						except Exception as e:
							self.stdout.write(self.style.ERROR(
								f"Error processing thumbnail: {str(e)}"
							))
					else:
						self.stdout.write(self.style.WARNING(
							f"Thumbnail file not found: {thumbnail_path}"
						))
						# Create placeholder since thumbnail file wasn't found
						self._create_placeholder_thumbnail(project)
				elif created:  # Only for new projects without thumbnail in JSON
					# Create placeholder thumbnail for new projects
					self._create_placeholder_thumbnail(project)

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

	def _create_placeholder_thumbnail(self, project):
		try:
			
			img = Image.new('RGB', (100, 100), color='blue')
			img_io = io.BytesIO()
			img.save(img_io, format='JPEG')
			img_io.seek(0)
			
			project.thumbnail.save(
				f"{project.slug}_thumbnail.jpg", 
				ContentFile(img_io.getvalue()),
				save=False
			)
			project.save(bypass_validation=True)
			self.stdout.write(self.style.SUCCESS(
				f'Created placeholder thumbnail for {project.slug}'
			))
		except Exception as e:
			self.stdout.write(self.style.ERROR(
				f'Placeholder thumbnail creation failed: {str(e)}'
			))

	def _resolve_media_path(self, relative_path):
		"""Try multiple ways to resolve the media path"""
		# Try the direct join
		path1 = os.path.join(settings.MEDIA_ROOT, relative_path)
		if os.path.exists(path1):
			return path1
		
		# Try without 'projects/' prefix if it's already in the path
		if relative_path.startswith('projects/'):
			path2 = os.path.join(settings.MEDIA_ROOT, relative_path.replace('projects/', '', 1))
			if os.path.exists(path2):
				return path2
		
		# Try with absolute path if media is a subfolder of current directory
		path3 = os.path.abspath(os.path.join('media', relative_path))
		if os.path.exists(path3):
			return path3
			
		# Return the original path if none of the above work
		return path1