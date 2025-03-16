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

app = FastAPI()

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

	# Create unique session ID
	session_id = str(uuid.uuid4())
	
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
		sandbox_dir = f"/app/sandboxes/{session_id}"
		os.makedirs(sandbox_dir, exist_ok=True)
		
		# Download project files if needed
		project_dir = f"/home/coder/projects/{project_slug}"
		if not os.path.exists(project_dir):
			os.makedirs(project_dir, exist_ok=True)
			# Here you'd download the project files
		
		# Initialize terminal
		child = spawn(f'bash --rcfile /app/bashrc', cwd=project_dir)
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
				if 'command' in message:
					if message.get('execute', False):
						# Full command execution
						command = message['command']
						if validate_command(command):
							child.sendline(command)
						else:
							await websocket.send_text(json.dumps({
								'output': f"Command not permitted: {command}\r\n"
							}))
					else:
						# Single character input
						child.send(message['command'])
				elif 'resize' in message:
					# Handle terminal resize
					resize = message['resize']
					child.setwinsize(resize['rows'], resize['cols'])
			except Exception as e:
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
				await websocket.send_text(json.dumps({
					'output': output.decode('utf-8', errors='replace')
				}))
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
        r'^ls(\s+-[altrh]+)*(\s+[\w\./-]+)*$',
        r'^cat(\s+[\w\./-]+)+$',
        # Add more allowed command patterns
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

@app.on_event("shutdown")
async def shutdown_event():
	# Terminate all active terminals
	for session_id, child in active_terminals.items():
		try:
			child.close()
		except:
			pass

@app.get("/error-stats")
async def error_statistics():
    return {
        "errors": error_counter,
        "last_error": last_error_message,
        "last_error_time": last_error_timestamp
    }