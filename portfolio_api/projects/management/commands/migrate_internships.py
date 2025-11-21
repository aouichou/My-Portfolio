"""
Management command to migrate old Internship and InternshipProject data 
to the unified Project model with project_type='internship'
"""
from django.core.management.base import BaseCommand

from projects.models import Internship, InternshipProject, Project


class Command(BaseCommand):
    help = 'Migrate Internship and InternshipProject data to unified Project model'

    def handle(self, *args, **options):
        migrated_count = 0
        
        # Get all InternshipProjects
        internship_projects = InternshipProject.objects.select_related('internship').all()
        
        for ip in internship_projects:
            internship = ip.internship
            
            # Check if already migrated
            if Project.objects.filter(slug=ip.slug).exists():
                self.stdout.write(
                    self.style.WARNING(f'Project {ip.slug} already exists, skipping...')
                )
                continue
            
            # Create unified Project entry
            project = Project(
                title=ip.title,
                slug=ip.slug,
                description=ip.description or '',
                readme=ip.readme or '',
                tech_stack=ip.tech_stack or [],
                live_url=ip.live_url or '',
                code_url=ip.code_url or '',
                is_featured=ip.is_featured,
                score=ip.order or 90,
                features=ip.features or [],
                challenges=ip.challenges or '',
                lessons=ip.lessons_learned or '',
                project_type='internship',
                
                # Internship-specific fields
                company=internship.company,
                role=internship.role,
                subtitle=internship.subtitle or '',
                start_date=internship.start_date,
                end_date=internship.end_date,
                overview=ip.overview or internship.overview or '',
                stats=ip.stats or internship.stats or {},
                technologies=ip.technologies or internship.technologies or [],
                impact_metrics=ip.impact_metrics or {},
                architecture_description=ip.architecture_description or '',
                architecture_diagram=ip.architecture_diagram or internship.architecture_diagram or '',
                code_samples=ip.code_samples or internship.code_samples or [],
                documentation_items=ip.documentation or [],
                responsibilities=ip.responsibilities or [],
                achievements=ip.achievements or [],
                team_collaboration=ip.team_collaboration or '',
                
                # Demo fields if available
                has_interactive_demo=ip.has_interactive_demo or False,
                demo_commands=ip.demo_commands or {},
                demo_files_path=ip.demo_files_path or '',
                code_steps=ip.code_steps or {},
                code_snippets=ip.code_snippets or {}
            )
            
            project.save()
            migrated_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(f'✓ Migrated: {project.title} ({project.company})')
            )
        
        self.stdout.write(
            self.style.SUCCESS(f'\nSuccessfully migrated {migrated_count} internship projects')
        )
