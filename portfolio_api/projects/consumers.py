# portfolio_api/projects/consumers.py

import json
import asyncio
import os
import re
from channels.generic.websocket import AsyncWebsocketConsumer
from .views import download_project_files
import boto3
import zipfile
from django.conf import settings
from channels.db import database_sync_to_async
from projects.models import Project
from pty_manager import AsyncPTY
import datetime

class TerminalConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.project_slug = self.scope['url_route']['kwargs']['project_slug']
		
		# Accept the WebSocket connection
		await self.accept()
		
		# Send welcome message
		await self.send(text_data=json.dumps({
			'output': f"Initializing environment for {self.project_slug}...\r\n"
		}))
		
		# Setup project files and start PTY
		asyncio.create_task(self.setup_terminal())
	
	async def setup_terminal(self):
		try:
			# Download project files
			await self.send(text_data=json.dumps({
				'output': "Downloading project files...\r\n"
			}))
			
			# Create project directory
			project_dir = os.path.join(os.getcwd(), 'projects', self.project_slug)
			os.makedirs(project_dir, exist_ok=True)
			
			# Download and extract project files from S3
			project = await database_sync_to_async(Project.objects.get)(slug=self.project_slug)
			if project.demo_files_path:
				success = await database_sync_to_async(self.download_and_extract)(
					project.demo_files_path, project_dir)
				if not success:
					await self.send(text_data=json.dumps({
						'output': "Warning: Could not download project files\r\n"
					}))
			
			# Initialize the PTY
			env = os.environ.copy()
			env['TERM'] = 'xterm-256color'
			
			self.pty = AsyncPTY(
				'/bin/bash',
				cwd=project_dir,
				env=env,
				timeout=30
			)
			await self.pty.start()

			# Write welcome message
			await self.send(text_data=json.dumps({
				'output': f"\r\nWelcome to the {self.project_slug} terminal demo!\r\n"
						  f"Type 'ls' to see project files\r\n\r\n"
						  f"{self.project_slug}:~$ "
			}))
			
		except Exception as e:
			await self.send(text_data=json.dumps({
				'output': f"\r\nError setting up terminal: {str(e)}\r\n"
			}))
	
	def download_and_extract(self, demo_files_path, project_dir):
		try:
			# Download from S3
			s3 = boto3.client(
				's3',
				aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
				aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
				region_name=settings.AWS_S3_REGION_NAME
			)
			
			zip_path = os.path.join(project_dir, 'project.zip')
			s3.download_file(
				settings.AWS_STORAGE_BUCKET_NAME,
				demo_files_path,
				zip_path
			)
			
			# Extract files
			with zipfile.ZipFile(zip_path, 'r') as zip_ref:
				zip_ref.extractall(project_dir)
				
			# Remove zip file
			os.remove(zip_path)
			return True
			
		except Exception as e:
			print(f"Error downloading project files: {e}")
			return False
	
	async def receive(self, text_data):
		try:
			print(f"Received WebSocket data: {text_data}")
			data = json.loads(text_data)
			
			if 'command' in data:
				command = data['command']
				print(f"Processing command: '{command}', length: {len(command)}")
				
				# For single character input (interactive typing)
				if len(command) == 1:
					await self.pty.write(command)
					output = await self.pty.read(timeout=0.5)
					await self.send(text_data=json.dumps({
						'output': output.decode('utf-8', errors='replace')
					}))
					return
					
				# For full commands (when Enter is pressed)
				if command.endswith('\r') or command.endswith('\n'):
					# Strip the newline character
					command = command.rstrip('\r\n')
					
					# Validate complete commands only
					if command and not self.validate_command(command):
						await self.send(text_data=json.dumps({
							'output': f"Command not permitted: {command}\r\n"
						}))
						return
					
				# Execute command
				await self.pty.write(command)
				output = await self.pty.read(timeout=5)
				await self.send(text_data=json.dumps({
					'output': output.decode('utf-8', errors='replace')
				}))
				
			# Handle resize events
			elif 'resize' in data:
				# Resize terminal if supported
				if hasattr(self, 'pty') and hasattr(self.pty, 'resize'):
					rows = data['resize'].get('rows', 24)
					cols = data['resize'].get('cols', 80)
					self.pty.resize(rows, cols)
				
		except Exception as e:
			print(f"Error in receive: {e}")
			await self.send(text_data=json.dumps({
				'output': f"\r\nError executing command: {str(e)}\r\n"
			}))
	
	async def disconnect(self, close_code):
		# Clean up the PTY when WebSocket closes
		if hasattr(self, 'pty'):
			self.pty.terminate()
	
	def validate_command(self, command):
		# Basic command set (general purpose)
		allowed_commands = {
			# Development tools
			r'^make(\s+[\w-]+)*$',
			r'^gcc(\s+[-\w\.\/]+)*$',
			r'^g\+\+(\s+[-\w\.\/]+)*$',
			r'^python3?(\s+[\w\./-]+)*$',
			r'^npm(\s+(run|install|start|test)\s+[\w-]+)$',
			
			# Basic shell commands
			r'^ls(\s+-[altrh]+)*(\s+[\w\./-]+)*$',
			r'^cat\s+[\w\./-]+$',
			r'^cd\s+[\w\./-]+$',
			r'^pwd$',
			r'^echo(\s+.+)?$',
			r'^grep(\s+-[ivnE]+)*(\s+[\w\./-]+)*$',
			r'^find(\s+[\w\./-]+)(\s+-name\s+[\w\.\*-]+)?$',
			
			# Project-specific commands
			r'^\.\/[\w\.-]+(\s+[\w\./-]+)*$',  # Run executable
		}
		
		return any(re.match(pattern, command) for pattern in allowed_commands)

class HealthCheckConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		await self.accept()
		await self.send(text_data=json.dumps({
			'status': 'healthy',
			'timestamp': datetime.datetime.now().isoformat()
		}))
		await self.close()