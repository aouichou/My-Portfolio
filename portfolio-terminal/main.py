# portfolio-terminal/main.py

import asyncio
import os
import redis
import json
import time
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pexpect import spawn, EOF
import json
import psutil
import re
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
	# Startup code
	print("Starting terminal service...")
	yield
	# Shutdown code - runs when the application is shutting down
	print("Shutting down terminal service...")
	# Terminate all active terminals
	for session_id, child in active_terminals.items():
		try:
			child.close()
			print(f"Terminated terminal session {session_id}")
		except Exception as e:
			print(f"Error terminating session {session_id}: {e}")
	
	print("Terminal service shutdown complete")

app = FastAPI(lifespan=lifespan)

active_terminals = {}
error_counter = 0
last_error_message = ""
last_error_timestamp = None


redis_client = redis.Redis.from_url(
	os.environ.get('REDIS_URL', 'redis://localhost:6379'),
	decode_responses=True
)

@app.get("/metrics")
async def metrics():
	memory = psutil.virtual_memory()
	return {
		"memory_used_percent": memory.percent,
		"active_terminals": len(active_terminals),
		"uptime": time.time() - app_start_time
	}

app_start_time = time.time()

@app.get("/healthz")
async def health_check():
	return {"status": "healthy"}

@app.websocket("/terminal/{project_slug}/")
async def terminal_endpoint(websocket: WebSocket, project_slug: str):
	await websocket.accept()
	print(f"WebSocket connection accepted for {project_slug}")

	# Create unique session ID
	session_id = str(uuid.uuid4())
	print(f"Generated session ID: {session_id}")
	
	# Store terminal session in Redis
	session_info = {
		'id': session_id,
		'project': project_slug,
		'created': time.time(),
		'client_ip': websocket.client.host
	}
	redis_client.setex(f"terminal_session:{session_id}", 3600, json.dumps(session_info))
	
	try:
		# Create sandbox directory
		sandbox_dir = f"/home/coder/sandboxes/{session_id}"
		os.makedirs(sandbox_dir, exist_ok=True)
		
		# Download project files if needed
		project_dir = f"/home/coder/projects/{project_slug}"
		if not os.path.exists(project_dir):
			os.makedirs(project_dir, exist_ok=True)
			# Download project files from S3
			files_downloaded = download_project_files(project_slug, project_dir)
			if not files_downloaded:
				# Create a minimal README if files couldn't be downloaded
				with open(f"{project_dir}/README.md", "w") as f:
					f.write(f"# {project_slug}\n\nWelcome to the terminal demo!\n")
		
		env = os.environ.copy()
		env['TERM'] = 'xterm-256color'  # Important for proper terminal behavior
		env['PS1'] = '\\[\\033[1;32m\\]\\u@\\h:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ '

		# Initialize terminal
		child = spawn('bash --rcfile /app/bashrc -n', cwd=project_dir, env=env)
		try:
			await asyncio.sleep(0.5)  # Short delay for shell to initialize
			child.expect_exact(['$', '#'], timeout=2)  # Wait for prompt
		except Exception as e:
			print(f"Error waiting for prompt: {e}")
		active_terminals[session_id] = child
		
		# Send welcome message
		await websocket.send_text(json.dumps({
			'output': f"Connected to terminal for {project_slug}...\r\n"
		}))
		
		# Start reading terminal output
		read_task = asyncio.create_task(read_terminal_output(websocket, child))
		
		# Process client messages
		while True:
			data = await websocket.receive_text()
			try:
				message = json.loads(data)
				
				# NEW: Simplified input handling
				if 'input' in message:
					# Send raw input to the terminal
					raw_input = message['input']
					child.send(raw_input)
				elif 'resize' in message:
					# Handle terminal resize
					resize = message['resize']
					child.setwinsize(resize['rows'], resize['cols'])
			except Exception as e:
				print(f"Error processing message: {e}")
				await websocket.send_text(json.dumps({
					'output': f"\r\nError: {str(e)}\r\n"
				}))
				
	except WebSocketDisconnect:
		pass
	finally:
		# Cleanup
		if session_id in active_terminals:
			try:
				active_terminals[session_id].close()
				del active_terminals[session_id]
				redis_client.delete(f"terminal_session:{session_id}")
			except:
				pass

async def read_terminal_output(websocket, child):
	while True:
		try:
			output = await asyncio.get_event_loop().run_in_executor(
				None, lambda: child.read_nonblocking(size=1024, timeout=0.1)
			)
			if output:
				try:
					await websocket.send_text(json.dumps({
						'output': output.decode('utf-8', errors='replace')
					}))
				except Exception as e:
					print(f"Error sending to WebSocket: {e}")
					break  # Break the loop if WebSocket is disconnected
		except EOF:
			await websocket.send_text(json.dumps({
				'output': "\r\nSession terminated.\r\n"
			}))
			break
		except Exception as e:
			# Timeout or other error, just continue
			await asyncio.sleep(0.1)

def validate_command(command):
	# Allowlist approach is more secure than denylist
	allowed_patterns = [
		# Basic navigation and file inspection
		r'^ls(\s+-[altrh]+)*(\s+[\w\./-]+)*$',
		r'^cat(\s+[\w\./-]+)+$',
		r'^cd(\s+[\w\./-]+)?$',
		r'^pwd$',
		r'^echo\s+.*$',
		r'^clear$',
		
		# Development commands
		r'^make(\s+[\w-]+)?$',
		r'^gcc(\s+-[a-zA-Z]+)*(\s+[\w\./-]+)+$',
		r'^./[\w-]+$',  # Run executables in current directory
		
		# Basic file manipulation
		r'^touch\s+[\w\./-]+$',
		r'^mkdir(\s+-p)?\s+[\w\./-]+$',
		
		# Help commands
		r'^help$',
		r'^man\s+[\w-]+$'
	]
	
	# Check if command matches any allowed pattern
	if any(re.match(pattern, command) for pattern in allowed_patterns):
		return True
		
	# Additional deny list for extra security
	dangerous_commands = [
		'rm -rf', 'sudo', 'chmod 777', ':(){', 'curl | bash',
		'wget | bash', '> /dev', '> /proc', '> /sys'
	]
	
	for cmd in dangerous_commands:
		if cmd in command:
			return False
	
	# Default to a more permissive approach for now
	return True

@app.get("/error-stats")
async def error_statistics():
	return {
		"errors": error_counter,
		"last_error": last_error_message,
		"last_error_time": last_error_timestamp
	}

def download_project_files(project_slug, project_dir):
	"""Download project files from S3 if they exist"""
	try:
		import boto3
		import zipfile
		import tempfile
		
		# Initialize S3 client with environment variables
		s3 = boto3.client(
			's3',
			aws_access_key_id=os.environ.get('BUCKETEER_AWS_ACCESS_KEY_ID'),
			aws_secret_access_key=os.environ.get('BUCKETEER_AWS_SECRET_ACCESS_KEY'),
			region_name=os.environ.get('AWS_S3_REGION_NAME', 'eu-west-1')
		)
		
		# The expected file path in S3 (matches your Django view)
		s3_path = f'project-files/{project_slug}.zip'
		bucket_name = os.environ.get('BUCKETEER_BUCKET_NAME')
		
		if not bucket_name:
			print(f"Missing S3 bucket configuration")
			return False
			
		# Create temp file for downloading
		with tempfile.NamedTemporaryFile() as temp_file:
			try:
				# Download the zip file from S3
				s3.download_file(bucket_name, s3_path, temp_file.name)
				
				# Extract the zip file to the project directory
				with zipfile.ZipFile(temp_file.name, 'r') as zip_ref:
					zip_ref.extractall(project_dir)
					
				print(f"Successfully extracted project files to {project_dir}")
				return True
			except Exception as e:
				print(f"Failed to download/extract project files: {e}")
				return False
	except Exception as e:
		print(f"Project file download error: {e}")
		return False