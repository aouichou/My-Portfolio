# portfolio_api/pty_manager.py

import asyncio
import fcntl
import os
import pty
import select
import signal
import struct
from termios import TIOCSWINSZ


class AsyncPTY:
	def __init__(self, command, cwd=None, env=None, timeout=15):
		self.command = command
		self.cwd = cwd
		self.env = env or os.environ.copy()
		self.timeout = timeout
		self.pid = None
		self.fd = None
		
	async def start(self):
		loop = asyncio.get_event_loop()
		
		# Create pty in a thread to avoid blocking
		self.pid, self.fd = await loop.run_in_executor(
			None, 
			lambda: pty.fork()
		)
		
		if self.pid == 0:  # Child process
			# Execute shell with hardcoded path to prevent command injection
			try:
				os.chdir(self.cwd)
				# Use hardcoded shell path instead of dynamic command
				shell_path = os.getenv('SHELL_PATH', '/bin/bash')
				if not os.path.exists(shell_path):
					shell_path = '/bin/sh'  # Fallback to sh
				os.execv(shell_path, [shell_path, '-l'])  # -l for login shell
			except Exception as e:
				print(f"Error executing command: {e}")
				os._exit(1)
		
		# Make non-blocking
		flags = fcntl.fcntl(self.fd, fcntl.F_GETFL)
		fcntl.fcntl(self.fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
		
		return self.fd
		
	async def write(self, data):
		loop = asyncio.get_event_loop()
		await loop.run_in_executor(None, lambda: os.write(self.fd, data.encode()))
		
	async def read(self, timeout=None):
		timeout = timeout or self.timeout
		loop = asyncio.get_event_loop()
		
		try:
			# Wait for data with timeout
			result = await asyncio.wait_for(
				loop.run_in_executor(
					None,
					lambda: self._read_data()
				),
				timeout=timeout
			)
			return result
		except asyncio.TimeoutError:
			return b"Command timed out\r\n"

	def _read_data(self):
		output = b""
		max_attempts = 10
		attempts = 0
		
		try:
			while attempts < max_attempts:
				r, w, e = select.select([self.fd], [], [], 0.2)
				if not r:
					# No data available, but first check if we've already read something
					if output:
						break
					attempts += 1
					continue
					
				try:
					data = os.read(self.fd, 1024)
					if not data:
						break
					output += data
					# Reset attempts since we got data
					attempts = 0
				except OSError:
					break
		except Exception:
			print("Error reading from PTY")
		return output

	def resize(self, rows, cols):
		try:
			winsize = struct.pack("HHHH", rows, cols, 0, 0)
			if self.fd is not None:
				fcntl.ioctl(int(self.fd), TIOCSWINSZ, winsize)
		except Exception as e:
			print(f"Error resizing terminal: {e}")
	
	def terminate(self):
		if self.pid:
			try:
				os.kill(self.pid, signal.SIGTERM)
				os.waitpid(self.pid, 0)
			except (OSError, ProcessLookupError):
				pass
			
		if self.fd:
			try:
				os.close(self.fd)
			except OSError as e:
				print(f"Error closing file descriptor: {e}")

	async def disconnect(self, close_code):
		print(f"WebSocket disconnecting with code: {close_code}")
		# Clean up the PTY when WebSocket closes
		if hasattr(self, 'pty'):
			try:
				self.pty.terminate()
				print("PTY terminated successfully")
			except Exception as e:
				print(f"Error terminating PTY: {e}")