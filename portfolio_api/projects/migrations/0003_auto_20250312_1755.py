# In the generated migration file
from django.db import migrations, models

def forward_migration(apps, schema_editor):
    """Convert architecture diagram images to text representation"""
    Project = apps.get_model('projects', 'Project')
    for project in Project.objects.all():
        if project.architecture_diagram and hasattr(project.architecture_diagram, 'url'):
            # Store the URL as SVG-embedded image
            project.architecture_diagram_text = f'<img src="{project.architecture_diagram.url}" alt="Architecture Diagram" />'
            project.diagram_type = 'SVG'
            project.save(update_fields=['architecture_diagram_text', 'diagram_type'])

class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0002_alter_project_options_and_more'),
    ]

    operations = [
        # 1. Add new fields
        migrations.AddField(
            model_name='project',
            name='architecture_diagram_text',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='project',
            name='diagram_type',
            field=models.CharField(choices=[('MERMAID', 'Mermaid.js'), ('PLANTUML', 'PlantUML'), ('ASCII', 'ASCII Art'), ('SVG', 'SVG XML'), ('CUSTOM', 'Custom Format')], default='MERMAID', max_length=10),
        ),
        # 2. Run data migration
        migrations.RunPython(forward_migration, migrations.RunPython.noop),
        # 3. Remove old field
        migrations.RemoveField(
            model_name='project',
            name='architecture_diagram',
        ),
        # 4. Rename new field to original name
        migrations.RenameField(
            model_name='project',
            old_name='architecture_diagram_text',
            new_name='architecture_diagram',
        ),
    ]