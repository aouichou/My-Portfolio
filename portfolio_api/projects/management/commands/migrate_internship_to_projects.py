"""
Management command to migrate InternshipProject data to Project model
Usage: python manage.py migrate_internship_to_projects
"""

from django.core.management.base import BaseCommand

from projects.models import Internship, Project


class Command(BaseCommand):
	help = 'Migrate internship projects to unified Project model'

	def add_arguments(self, parser):
		parser.add_argument(
			'--dry-run',
			action='store_true',
			help='Preview changes without saving to database',
		)

	def handle(self, *args, **options):
		dry_run = options['dry_run']
		
		if dry_run:
			self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))
		
		# Get all active internships
		internships = Internship.objects.filter(is_active=True).prefetch_related('projects')
		
		total_created = 0
		total_skipped = 0
		
		for internship in internships:
			self.stdout.write(f'\n{self.style.SUCCESS("="*60)}')
			self.stdout.write(f'Processing: {internship.role} @ {internship.company}')
			self.stdout.write(f'{self.style.SUCCESS("="*60)}')
			
			for int_project in internship.projects.all():
				self.stdout.write(f'\n  → Project: {int_project.title}')
				
				# Check if project already exists
				existing = Project.objects.filter(slug=int_project.slug).first()
				if existing:
					self.stdout.write(self.style.WARNING(f'    ⚠ Skipped: Project with slug "{int_project.slug}" already exists'))
					total_skipped += 1
					continue
				
				if dry_run:
					self.stdout.write(self.style.NOTICE(f'    ✓ Would create: {int_project.title}'))
					total_created += 1
					continue
				
				# Create new Project from InternshipProject
				project = Project(
					# Type & Classification
					project_type='internship',
					is_featured=int_project.is_featured,
					
					# Basic Info
					title=int_project.title,
					slug=int_project.slug,
					description=int_project.description,
					thumbnail=int_project.thumbnail,
					thumbnail_url=int_project.thumbnail_url,
					
					# Internship-specific
					company=internship.company,
					role=internship.role,
					start_date=internship.start_date,
					end_date=internship.end_date,
					stats=int_project.stats,
					badges=int_project.badges,
					role_description=int_project.role_description,
					impact_metrics=int_project.impact_metrics,
					
					# Technical Content
					tech_stack=int_project.tech_stack,
					readme=int_project.overview,  # Map overview to readme
					challenges=int_project.role_description,  # Could be repurposed
					
					# Architecture (use first diagram if available)
					architecture_diagram=(
						int_project.architecture_diagrams[0]['diagram']
						if int_project.architecture_diagrams
						else int_project.architecture_description
					),
					diagram_type='mermaid' if int_project.architecture_diagrams else 'custom',
					
					# Code
					code_snippets=int_project.code_snippets,
					features=int_project.key_features,
					
					# URLs (internships typically don't have these)
					live_url=None,
					code_url=None,
					video_url=None,
					
					# Demo
					has_interactive_demo=False,
					demo_commands=None,
					demo_files_path=None,
					
					# Score (default for internships)
					score=100,  # Give internships a high default score
				)
				
				try:
					project.save(bypass_validation=True)
					self.stdout.write(self.style.SUCCESS(f'    ✓ Created: {project.title} (slug: {project.slug})'))
					total_created += 1
				except Exception as e:
					self.stdout.write(self.style.ERROR(f'    ✗ Error: {str(e)}'))
		
		self.stdout.write(f'\n{self.style.SUCCESS("="*60)}')
		self.stdout.write(f'{self.style.SUCCESS("SUMMARY")}')
		self.stdout.write(f'{self.style.SUCCESS("="*60)}')
		self.stdout.write(f'Total created: {self.style.SUCCESS(str(total_created))}')
		self.stdout.write(f'Total skipped: {self.style.WARNING(str(total_skipped))}')
		
		if dry_run:
			self.stdout.write(f'\n{self.style.WARNING("This was a DRY RUN. Run without --dry-run to apply changes.")}')
		else:
			self.stdout.write(f'\n{self.style.SUCCESS("✓ Migration complete!")}')
			self.stdout.write('\nNext steps:')
			self.stdout.write('1. Verify projects at /api/projects/?project_type=internship')
			self.stdout.write('2. Check featured internships: /api/projects/?is_featured=true&project_type=internship')
			self.stdout.write('3. Update frontend to use unified /api/projects/ endpoint')
