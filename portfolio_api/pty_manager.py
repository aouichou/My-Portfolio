# portfolio_api/pty_manager.py

import os
import pty
import select
import subprocess
import termios
import fcntl
import struct
import signal
import asyncio

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
            # Execute shell
            try:
                os.chdir(self.cwd)
                os.execve(self.command, [self.command], self.env)
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
        try:
            while True:
                r, w, e = select.select([self.fd], [], [], 0.1)
                if not r:
                    break
                    
                try:
                    data = os.read(self.fd, 1024)
                    if not data:
                        break
                    output += data
                except OSError:
                    break
        except Exception as e:
            print(f"Error reading from PTY: {e}")
        
        return output
        
    def resize(self, rows, cols):
        try:
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)
        except Exception as e:
            print(f"Error resizing terminal: {e}")
    
    def terminate(self):
        if self.pid:
            try:
                os.kill(self.pid, signal.SIGTERM)
                os.waitpid(self.pid, 0)
            except:
                pass
            
        if self.fd:
            try:
                os.close(self.fd)
            except:
                pass