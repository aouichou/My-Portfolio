# portfolio-terminal/main.py

import asyncio
import json
import logging
import os
import re
import shutil
import tempfile
import time
import uuid
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path

import aiohttp
import boto3
import psutil
import redis
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pexpect import EOF, spawn

logger = logging.getLogger(__name__)

# Security: Allowed project slugs (whitelist approach)
ALLOWED_PROJECTS = {
	'minishell', 'push_swap', 'philosophers', 'minitalk', 
	'fdf', 'ft_irc', 'minirt', 'cub3d', 'ft_transcendence'
}

def sanitize_project_slug(project_slug: str) -> str:
	"""
	Validate and sanitize project slug to prevent path traversal attacks.
	Returns sanitized slug or raises HTTPException.
	"""
	# Remove any whitespace
	project_slug = project_slug.strip()
	
	# Check if empty
	if not project_slug:
		raise HTTPException(status_code=400, detail="Project slug cannot be empty")
	
	# Only allow alphanumeric, underscore, and hyphen
	if not re.match(r'^[a-zA-Z0-9_-]+$', project_slug):
		raise HTTPException(status_code=400, detail="Invalid project slug format")
	
	# Check against whitelist
	if project_slug.lower() not in ALLOWED_PROJECTS:
		raise HTTPException(status_code=403, detail="Project not found")
	
	# Prevent path traversal attempts
	if '..' in project_slug or '/' in project_slug or '\\' in project_slug:
		raise HTTPException(status_code=400, detail="Invalid characters in project slug")
	
	return project_slug.lower()

def safe_join_path(base_dir: str, *paths: str) -> str:
	"""
	Safely join paths and ensure result is within base_dir.
	Prevents path traversal attacks.
	"""
	# Resolve the base directory to an absolute path
	base = Path(base_dir).resolve()
	
	# Join and resolve the full path
	full_path = Path(base, *paths).resolve()
	
	# Ensure the resolved path is within the base directory
	try:
		full_path.relative_to(base)
	except ValueError:
		raise HTTPException(status_code=403, detail="Access denied: path traversal detected")
	
	return str(full_path)

def apply_security_restrictions(child_process):
	"""Apply security restrictions to spawned processes"""
	try:
		# Create a sandbox directory with restricted permissions
		sandbox_dir = f"/home/coder/sandboxes/{uuid.uuid4()}"
		os.makedirs(sandbox_dir, exist_ok=True)
		os.chmod(sandbox_dir, 0o644)  # rwx for owner, rx for others

		# Set resource limits
		import resource
		# Max CPU time in seconds
		resource.setrlimit(resource.RLIMIT_CPU, (60, 60))
		# Max file size in bytes (10MB)
		resource.setrlimit(resource.RLIMIT_FSIZE, (10*1024*1024, 10*1024*1024))
		# Max number of processes
		resource.setrlimit(resource.RLIMIT_NPROC, (50, 50))

		# Configure environment for security
		env = os.environ.copy()
		env['SHELL'] = '/bin/bash'
		env['PATH'] = '/usr/local/bin:/usr/bin:/bin'
		# Remove potentially dangerous environment variables
		for var in ['LD_PRELOAD', 'LD_LIBRARY_PATH']:
			if var in env:
				del env[var]

		# Set secure umask for file creation
		os.umask(0o022)  # Files created with 644, directories with 755

		# Log security application
		logger.info("Security restrictions applied to process")

		return env, sandbox_dir
	except Exception as e:
		logger.error("Failed to apply security restrictions: %s", e)
		raise

@asynccontextmanager
async def lifespan(app: FastAPI):
	# Startup code
	print("Starting terminal service...")

	# Start health check task
	health_check_task = asyncio.create_task(periodic_health_checks())

	# Check terminal security (skip in development mode)
	is_dev = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')
	if not is_dev and not check_terminal_security():
		print("Security check failed. Shutting down...")
		yield
		return
	elif is_dev:
		print("Running in development mode - security checks skipped")

	yield

	# Shutdown code
	print("Shutting down terminal service...")

	# Cancel health check task
	health_check_task.cancel()
	try:
		await health_check_task
	except asyncio.CancelledError:
		pass

	# Terminate all active terminals
	for session_id, child in active_terminals.items():
		try:
			child.close()
			print(f"Terminated terminal session {session_id}")
		except Exception as e:
			print(f"Error terminating session {session_id}: {e}")

	print("Terminal service shutdown complete")

app = FastAPI(lifespan=lifespan)

async def periodic_health_checks():
	"""Send periodic health checks to other services to prevent shutdown"""
	services = {
		"backend": os.environ.get("BACKEND_URL", "https://api.aouichou.me"),
		"frontend": os.environ.get("FRONTEND_URL", "https://aouichou.me")
	}

	while True:
		try:
			async with aiohttp.ClientSession() as session:
				for name, url in services.items():
					try:
						async with session.get(f"{url}/healthz", timeout=5) as response:
							print(f"Health check to {name}: {response.status}")
					except Exception as e:
						print(f"Failed health check to {name}: {str(e)}")
		except Exception as e:
			print(f"Error in health checks: {str(e)}")

		# Wait for 10 minutes before next check
		await asyncio.sleep(600)  # 600 seconds = 10 minutes

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
	logger.info("WebSocket connection accepted for %s", project_slug)
	
	# Initialize variables that might be used in finally block
	read_task = None

	try:
		# Validate and sanitize project slug
		project_slug = sanitize_project_slug(project_slug)
	except HTTPException as e:
		await websocket.send_json({'error': e.detail})
		await websocket.close()
		return

	# Create unique session ID
	session_id = str(uuid.uuid4())
	logger.info("Generated session ID: %s", session_id)
	
	# Store terminal session in Redis
	session_info = {
		'id': session_id,
		'project': project_slug,
		'created': time.time(),
		'client_ip': websocket.client.host
	}
	
	try:
		redis_client.setex(f"terminal_session:{session_id}", 3600, json.dumps(session_info))
	except Exception as e:
		logger.error("Redis error: %s", e)
	
	try:
		# Check for project directory and download files if needed
		# Use safe_join_path to prevent path traversal
		base_projects_dir = "/home/coder/projects"
		project_dir = safe_join_path(base_projects_dir, project_slug)
		should_download = False
		
		if not os.path.exists(project_dir):
			os.makedirs(project_dir, exist_ok=True)
			should_download = True
		else:
			# Directory exists, but check if it's empty or just contains README
			files = os.listdir(project_dir)
			if not files or (len(files) == 1 and 'README.md' in files):
				should_download = True
		
		if should_download:
			await websocket.send_json({
				'output': f"\r\n📦 Downloading project files for {project_slug}...\r\n"
			})
			await websocket.send_json({
				'output': "This may take 1-2 minutes for large projects. Please wait...\r\n\r\n"
			})
			
			# Download in a separate thread to avoid blocking
			loop = asyncio.get_event_loop()
			files_downloaded = await loop.run_in_executor(
				None, download_project_files, project_slug, project_dir
			)
			
			if not files_downloaded:
				await websocket.send_json({
					'output': "\r\n⚠️  Failed to download project files. Using empty project.\r\n"
				})
			else:
				await websocket.send_json({
					'output': "\r\n✅ Project files downloaded successfully!\r\n"
				})
		else:
			logger.info("Using existing project directory: %s, contains: %s", project_dir, os.listdir(project_dir))
		
		env = os.environ.copy()
		env['TERM'] = 'xterm-256color'
		env['PS1'] = '\\[\\033[1;32m\\]\\u@\\h:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ '
		env['HOME'] = '/home/coder'
		env['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'

		# Initialize terminal with bash instead of zsh - more reliable
		await websocket.send_json({
			'output': "\r\n🚀 Spawning terminal session...\r\n"
		})
		
		# Use bash instead of zsh for more reliable prompt detection
		child = spawn('/bin/bash', ['--login', '--restricted'], cwd=project_dir, env=env, encoding='utf-8', timeout=60)
		env, sandbox_dir = apply_security_restrictions(child)
		child.setwinsize(40, 120)  # Initial size

		
		# More permissive prompt detection with longer timeout
		# Account for:
		# - Shell initialization scripts (bashrc, profile)
		# - Network-mounted home directories
		# - Slow I/O on Render free tier
		try:
			# More lenient prompt patterns to catch various bash prompt styles
			# Including: colored prompts, custom PS1, unicode characters
			await asyncio.wait_for(
				asyncio.get_event_loop().run_in_executor(
					None, lambda: child.expect([
						r'[$#>]',  # Basic prompt chars
						r'bash.*[$#>]',  # bash-4.4$
						r'[@\w-]+[:~].*[$#>]',  # user@host:path$
						r'\[.*\].*[$#>]',  # Colored prompts with escape codes
						'.*[$#>]\s*$',  # Any prompt ending with $/#/>
					])
				),
				timeout=45  # Increased from 15s to 45s to handle slow initialization
			)
			logger.info("Bash prompt detected successfully")
		except asyncio.TimeoutError:
			# Don't fail - just log and continue
			# The terminal might be ready even if we didn't detect the prompt
			logger.warning("Prompt detection timed out after 45s, but continuing anyway")
			await websocket.send_json({
				'output': "\r\n⚠️  Prompt detection timed out, but terminal should be ready.\r\n"
			})
		except Exception as e:
			logger.error("Error waiting for prompt: %s", e)
			await websocket.send_json({
				'output': f"\r\n⚠️  Prompt detection error: {str(e)}, but terminal may still work.\r\n"
			})
		
		active_terminals[session_id] = child
		
		# Send welcome message
		await websocket.send_json({
			'output': f"\r\n\r\nWelcome to {project_slug} terminal! Type 'ls' to see project files.\r\n"
		})
		
		# Read from terminal in background task
		read_task = asyncio.create_task(read_terminal_output(websocket, child))
		
		# Process client messages
		while True:
			data = await websocket.receive_text()
			try:
				message = json.loads(data)
				
				# Handle resize commands
				if 'resize' in message and isinstance(message['resize'], dict):
					rows = message['resize'].get('rows', 24)
					cols = message['resize'].get('cols', 80)
					logger.info("Resizing terminal to %sx%s", rows, cols)
					child.setwinsize(rows, cols)
				
				# Handle input with command validation
				elif 'input' in message:
					user_input = message['input']
					
					# Check if this looks like a command (ends with enter/newline)
					if '\r' in user_input or '\n' in user_input:
						# Extract the command (everything before the newline)
						command = user_input.replace('\r', '').replace('\n', '').strip()
						
						# Validate command before sending to shell
						if command and not validate_command(command):
							# Command blocked - notify user
							await websocket.send_json({
								'output': f"\r\n❌ Command blocked by security policy: '{command}'\r\n"
							})
							await websocket.send_json({
								'output': "Only basic file inspection and compilation commands are allowed.\r\n"
							})
							# Don't send to the shell
							continue
					
					# Command is allowed or is just keystrokes - send to shell
					child.write(user_input)
					
			except json.JSONDecodeError:
				# Treat as raw input
				child.write(data)
			except Exception as e:
				logger.error("Error processing message: %s", e)
				await websocket.send_json({
					'output': f"\r\nError: {str(e)}\r\n"
				})
				
	except WebSocketDisconnect:
		logger.info("WebSocket disconnected for session %s", session_id)
	except Exception as e:
		logger.error("Terminal session error: %s", e)
		try:
			await websocket.send_json({
				'output': f"\r\n\r\nTerminal error: {str(e)}\r\n"
			})
		except Exception:
			pass
	finally:
		if read_task and not read_task.done():
			read_task.cancel()
			try:
				await read_task
			except asyncio.CancelledError:
				pass
		# Cleanup on disconnect
		if session_id in active_terminals:
			try:
				active_terminals[session_id].terminate()
				del active_terminals[session_id]
				logger.info("Terminated session %s", session_id)
			except Exception as cleanup_error:
				logger.error("Failed to terminate session %s: %s", session_id, cleanup_error)

async def read_terminal_output(websocket, child):
	while True:
		try:
			output = await asyncio.get_event_loop().run_in_executor(
				None, lambda: child.read_nonblocking(size=1024, timeout=0.1)
			)
			if output:
				print(f"Read from terminal: {output[:20]}...")
				try:
					await websocket.send_text(json.dumps({
						'output': output
					}))
					print(f"Sent message to client, length: {len(output)}")
				except Exception as e:
					print(f"Error sending to WebSocket: {e}")
					break  # Break the loop if WebSocket is disconnected
		except EOF:
			await websocket.send_text(json.dumps({
				'output': "\r\nSession terminated.\r\n"
			}))
			break
		except Exception:
			# Timeout or other error, just continue
			await asyncio.sleep(0.1)

def validate_command(command):
	"""Validate terminal commands with improved security"""
	# Strip whitespace for cleaner matching
	command = command.strip()
	
	# Allow empty commands (just pressing enter)
	if not command:
		return True
	
	# Allowlist approach for basic commands
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
		r'^man\s+[\w-]+$',
		r'^download\s+[\w\./-]+$',
	]
	
	# Check if command matches any allowed pattern
	for pattern in allowed_patterns:
		if re.match(pattern, command):
			logger.info("Command allowed by pattern: %s", command)
			return True
		
	# Container escape checks - CRITICAL SECURITY
	blocked_sequences = [
		'docker', 'kubectl', 'sudo', 'su ', 'ssh',
		'--privileged', '--cap-add', 'nsenter', 
		'unshare', 'mount', 'umount', 'chroot',
		'pivot_root', 'cgroup', 'setns', 'ptrace',
		'ld.so', 'proc', '/dev/'
	]
	
	if any(seq in command for seq in blocked_sequences):
		logger.warning("Blocked command with suspicious sequence: %s", command)
		return False
		
	# Path traversal protection
	if any('../' in part for part in command.split()):
		logger.warning("Blocked command with path traversal: %s", command)
		return False
		
	# Protect against command chaining/injection
	command_operators = [';', '&&', '||', '`', '$(',  '|', '>', '<']
	if any(op in command for op in command_operators):
		logger.warning("Blocked command with operator: %s", command)
		return False
		
	# Additional deny list for extra security
	dangerous_commands = [
		'rm -rf', 'chmod 777', ':(){', 'curl | bash',
		'wget | bash', '> /dev', '> /proc', '> /sys'
	]
	
	if any(cmd in command for cmd in dangerous_commands):
		logger.warning("Blocked dangerous command: %s", command)
		return False

	# If nothing matched, deny by default (security first)
	logger.warning("Command denied (no matching pattern): %s", command)
	return False

@app.get("/error-stats")
async def error_statistics():
	return {
		"errors": error_counter,
		"last_error": last_error_message,
		"last_error_time": last_error_timestamp
	}

def download_project_files(project_slug, project_dir):
	"""Download project files from S3 if they exist, or copy from local backend in DEBUG mode"""
	try:
		# Check if running in DEBUG mode (local development)
		is_dev = os.getenv('DEBUG', 'False').lower() in ('true', '1', 't')
		
		if is_dev:
			# Local development: copy from backend media directory
			local_zip_path = f'/backend-media/project-files/{project_slug}.zip'
			if os.path.exists(local_zip_path):
				print(f"Using local project files: {local_zip_path}")
				try:
					with zipfile.ZipFile(local_zip_path, 'r') as zip_ref:
						zip_ref.extractall(project_dir)
					print(f"✅ Extracted project files to {project_dir}")
					return True
				except Exception as e:
					print(f"Failed to extract local zip: {e}")
					return False
			else:
				print(f"Local project file not found: {local_zip_path}")
				return False
		
		# Production: download from S3
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
			print("Missing S3 bucket configuration")
			return False
			
		print(f"Looking for S3 object: {s3_path} in bucket {bucket_name}")

		# Check if we've already downloaded this project in the last 24 hours
		cache_marker = os.path.join(project_dir, ".cached_download")
		if os.path.exists(cache_marker):
			with open(cache_marker, 'r') as f:
				try:
					timestamp = float(f.read().strip())
					if time.time() - timestamp < 86400:  # 24 hours
						print("Using cached project files (downloaded less than 24h ago)")
						return True
				except Exception:
					pass

		try:
			# Get object metadata to check if it exists and get size
			obj = s3.head_object(Bucket=bucket_name, Key=s3_path)
			file_size = obj['ContentLength']
			print(f"Found object in S3. Size: {file_size} bytes")
			
			# For large files, check if we have enough disk space
			free_space = shutil.disk_usage(project_dir).free
			if free_space < file_size * 2:  # Need twice the space for zip + extracted files
				print(f"Not enough disk space to download and extract {file_size} bytes")
				return False
				
		except s3.exceptions.ClientError as e:
			if e.response['Error']['Code'] == '404':
				print(f"Project file {s3_path} doesn't exist in S3 bucket")
				return False
			else:
				print(f"Error checking S3 object: {e}")
				raise

		# Create temp file for downloading
		with tempfile.NamedTemporaryFile(suffix='.zip') as temp_file:
			try:
				# Download the zip file from S3 with progress reporting
				print(f"Downloading {s3_path} to {temp_file.name}")
				
				# Set up a callback to track download progress
				downloaded = 0
				last_reported = 0
				
				def download_progress(chunk):
					nonlocal downloaded, last_reported
					downloaded += chunk
					progress = int((downloaded / file_size) * 100)
					if progress > last_reported + 4:  # Report every 5%
						last_reported = progress
						print(f"Download progress: {progress}%")
				
				# Use TransferConfig with reduced threads for Render free tier
				config = boto3.s3.transfer.TransferConfig(
					multipart_threshold=1024 * 50,  # 50MB
					max_concurrency=2,  # Reduced from 10 to avoid thread exhaustion
					use_threads=False  # Disable threading on free tier
				)
				
				s3.download_file(
					bucket_name, 
					s3_path, 
					temp_file.name,
					Callback=download_progress,
					Config=config
				)
				
				# Check if file downloaded correctly
				file_size = os.path.getsize(temp_file.name)
				print(f"Downloaded file size: {file_size} bytes")
				if file_size == 0:
					print("Downloaded file is empty")
					return False
				
				# Extract the zip file to the project directory with progress updates
				print(f"Opening ZIP file {temp_file.name}")
				ALLOWED_EXTENSIONS = {'.c', '.h', '.md', '.py', '.txt', '.sh', '.Makefile', ''}
				with zipfile.ZipFile(temp_file.name, 'r') as zip_ref:
					for file in zip_ref.namelist():
						# Skip directory entries (end with /)
						if file.endswith('/'):
							continue
						# Check file extension
						file_ext = os.path.splitext(file)[1].lower()
						# Allow files with no extension (like Makefile) or allowed extensions
						if file_ext and file_ext not in ALLOWED_EXTENSIONS:
							raise zipfile.BadZipFile(f"Disallowed file type: {file}")
					total_files = len([f for f in zip_ref.namelist() if not f.endswith('/')])
					print(f"ZIP contains {total_files} files (excluding directories): {zip_ref.namelist()[:5]}...")
					
					# Extract in smaller batches to avoid memory issues
					for i, file in enumerate(zip_ref.namelist()):
						zip_ref.extract(file, project_dir)
						if i % 10 == 0:  # Report progress every 10 files
							print(f"Extracted {i}/{total_files} files")
				
				# Verify extraction
				extracted = os.listdir(project_dir)
				print(f"Files in project dir after extraction: {extracted}")
				if len(extracted) == 0:
					print("No files extracted")
					return False
					
				# Create cache marker
				with open(cache_marker, 'w') as f:
					f.write(str(time.time()))
					
				return True
			except zipfile.BadZipFile as e:
				print(f"Bad ZIP file: {e}")
				# Try to get file format info
				with open(temp_file.name, 'rb') as f:
					header = f.read(10)
					print(f"File header (hex): {header.hex()}")
				return False
			except Exception as e:
				print(f"Error extracting project: {e}")
				return False
	except Exception as e:
		print(f"Project file download error: {e}")
		return False

@app.get("/images/{project_slug}/{image_name}")
async def get_project_image(project_slug: str, image_name: str):
	"""Serve project generated images"""
	try:
		# Validate and sanitize project slug
		project_slug = sanitize_project_slug(project_slug)
		
		# Validate image name - only allow alphanumeric, dots, hyphens, underscores
		if not re.match(r'^[a-zA-Z0-9._-]+$', image_name):
			raise HTTPException(status_code=400, detail="Invalid image name")
		
		# Prevent path traversal in image name
		if '..' in image_name or '/' in image_name or '\\' in image_name:
			raise HTTPException(status_code=400, detail="Invalid characters in image name")
		
		# Use safe_join_path to construct the path
		base_projects_dir = "/home/coder/projects"
		project_dir = safe_join_path(base_projects_dir, project_slug)
		image_path = safe_join_path(project_dir, "images", image_name)
		
		# Verify the file exists and is within the expected directory
		if not os.path.exists(image_path):
			raise HTTPException(status_code=404, detail="Image not found")
		
		# Additional security: verify it's actually a file, not a directory
		if not os.path.isfile(image_path):
			raise HTTPException(status_code=403, detail="Invalid file type")
		
		return FileResponse(image_path)
		
	except HTTPException:
		raise
	except Exception as e:
		logger.error("Error serving image: %s", e)
		raise HTTPException(status_code=500, detail="Internal server error")

def check_terminal_security():
	"""Verify security setup of terminal environment"""
	logger.info("Verifying terminal security...")
	
	# Check if running as non-root
	if os.geteuid() == 0:
		logger.error("SECURITY ERROR: Running as root!")
		return False
	
	# Check if in privileged mode by attempting a blocked syscall
	try:
		# Try to create a user namespace which should be blocked
		pid = os.fork()
		if pid == 0:
			os.unshare(0x10000000)  # CLONE_NEWUSER
			os._exit(0)
		os.waitpid(pid, 0)
		logger.error("SECURITY ERROR: Container has user namespace privileges!")
		return False
	except OSError:
		# This is expected - we want this to fail
		logger.info("Security check passed: User namespace creation blocked")
	
	# Check filesystem permissions
	if os.access('/proc/kcore', os.R_OK):
		logger.error("SECURITY ERROR: Can access sensitive kernel files!")
		return False
	
	logger.info("Security checks passed. Terminal environment is secure")
	return True