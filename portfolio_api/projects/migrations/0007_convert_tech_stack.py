from django.db import migrations, models
import json

def convert_tech_stack(apps, schema_editor):
    # Get the Project model from the migration state
    Project = apps.get_model('projects', 'Project')
    
    # For each project, convert the JSON tech_stack to array format
    for project in Project.objects.all():
        # Handle various possible formats of the JSON data
        if not project.tech_stack:
            project.tech_stack_array = []
        elif isinstance(project.tech_stack, list):
            project.tech_stack_array = project.tech_stack
        elif isinstance(project.tech_stack, str):
            try:
                project.tech_stack_array = json.loads(project.tech_stack)
            except:
                project.tech_stack_array = [project.tech_stack]
        elif isinstance(project.tech_stack, dict):
            # If it's somehow a dict, use the values or keys
            project.tech_stack_array = list(project.tech_stack.values())
        else:
            # Fallback
            project.tech_stack_array = []
        
        project.save()

class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_project_thumbnail_url_and_more'),  # Replace with the actual previous migration
    ]

    operations = [
        # First add a new array field
        migrations.AddField(
            model_name='project',
            name='tech_stack_array',
            field=models.JSONField(blank=True, null=True, help_text="Temporary field for migration"),
        ),
        # Convert the data
        migrations.RunPython(convert_tech_stack),
        # Remove the old field
        migrations.RemoveField(
            model_name='project',
            name='tech_stack',
        ),
        # Add back the field with the correct type
        migrations.AddField(
            model_name='project',
            name='tech_stack',
            field=models.JSONField(blank=True, null=True, help_text="List of technologies used in the project"),
        ),
        # Copy data from temp field to new field
        migrations.RunSQL(
            "UPDATE projects_project SET tech_stack = tech_stack_array;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        # Remove the temporary field
        migrations.RemoveField(
            model_name='project',
			name='tech_stack_array',
		),
	]