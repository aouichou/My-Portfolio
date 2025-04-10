# portfolio-terminal/main.py

import asyncio
import os
import redis
import json
import time
import uuid
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pexpect import spawn, EOF
import psutil
import re
from contextlib import asynccontextmanager
import aiohttp
from fastapi.responses import FileResponse
import logging
import shutil
import tempfile
import zipfile
import boto3

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
	# Startup code
	print("Starting terminal service...")
	
	# Start health check task
	health_check_task = asyncio.create_task(periodic_health_checks())
	
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
    logger.info(f"WebSocket connection accepted for {project_slug}")

    # Create unique session ID
    session_id = str(uuid.uuid4())
    logger.info(f"Generated session ID: {session_id}")
    
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
        logger.error(f"Redis error: {e}")
    
    try:
        # Check for project directory and download files if needed
        project_dir = f"/home/coder/projects/{project_slug}"
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
                'output': f"\r\nDownloading project files for {project_slug}. This may take a minute...\r\n"
            })
            
            # Download in a separate thread to avoid blocking
            loop = asyncio.get_event_loop()
            files_downloaded = await loop.run_in_executor(
                None, download_project_files, project_slug, project_dir
            )
            
            if not files_downloaded:
                await websocket.send_json({
                    'output': "\r\nFailed to download project files. Using empty project.\r\n"
                })
        else:
            logger.info(f"Using existing project directory: {project_dir}, contains: {os.listdir(project_dir)}")
        
        env = os.environ.copy()
        env['TERM'] = 'xterm-256color'
        env['PS1'] = '\\[\\033[1;32m\\]\\u@\\h:\\[\\033[1;34m\\]\\w\\[\\033[0m\\]\\$ '
        env['HOME'] = '/home/coder'
        env['PATH'] = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'

        # Initialize terminal with bash instead of zsh - more reliable
        await websocket.send_json({
            'output': "\r\nStarting terminal session...\r\n"
        })
        
        # Use bash instead of zsh for more reliable prompt detection
        child = spawn('/bin/bash', ['--login'], cwd=project_dir, env=env, encoding='utf-8', timeout=60)
        child.setwinsize(40, 120)  # Initial size
        
        # More permissive prompt detection
        try:
            # Less strict prompt detection pattern
            await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(
                    None, lambda: child.expect([r'[$#>]', r'[~]?.*[$#>]', r'.*[$#>]'])
                ),
                timeout=15
            )
        except Exception as e:
            logger.error(f"Error waiting for prompt: {e}")
            await websocket.send_json({
                'output': "\r\nPrompt detection timed out, but terminal may still be ready.\r\n"
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
                    logger.info(f"Resizing terminal to {rows}x{cols}")
                    child.setwinsize(rows, cols)
                
                # Handle input
                elif 'input' in message:
                    child.write(message['input'])
                    
            except json.JSONDecodeError:
                # Treat as raw input
                child.write(data)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                await websocket.send_json({
                    'output': f"\r\nError: {str(e)}\r\n"
                })
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Terminal session error: {e}")
        try:
            await websocket.send_json({
                'output': f"\r\n\r\nTerminal error: {str(e)}\r\n"
            })
        except:
            pass
    finally:
        if 'read_task' in locals() and not read_task.done():
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
                logger.info(f"Terminated session {session_id}")
            except:
                logger.error(f"Failed to terminate session {session_id}")

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
		r'^man\s+[\w-]+$',
		r'^download\s+[\w\./-]+$',
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
            
        print(f"Looking for S3 object: {s3_path} in bucket {bucket_name}")

        # Check if we've already downloaded this project in the last 24 hours
        cache_marker = os.path.join(project_dir, ".cached_download")
        if os.path.exists(cache_marker):
            with open(cache_marker, 'r') as f:
                try:
                    timestamp = float(f.read().strip())
                    if time.time() - timestamp < 86400:  # 24 hours
                        print(f"Using cached project files (downloaded less than 24h ago)")
                        return True
                except:
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
                
                # Use TransferConfig for optimized downloads
                config = boto3.s3.transfer.TransferConfig(
                    multipart_threshold=1024 * 25,  # 25MB
                    max_concurrency=10,
                    use_threads=True
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
                with zipfile.ZipFile(temp_file.name, 'r') as zip_ref:
                    total_files = len(zip_ref.namelist())
                    print(f"ZIP contains {total_files} files: {zip_ref.namelist()[:5]}...")
                    
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
	project_dir = f"/home/coder/projects/{project_slug}"
	image_path = os.path.join(project_dir, "images", image_name)
	
	if not os.path.exists(image_path):
		return {"error": "Image not found"}
	
	return FileResponse(image_path)