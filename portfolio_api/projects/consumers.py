# In portfolio_api/projects/consumers.py

import websockets
from channels.generic.websocket import AsyncWebsocketConsumer
import json
import os
import asyncio

class TerminalConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		self.project_slug = self.scope['url_route']['kwargs']['project_slug']
		
		# Accept WebSocket connection from browser
		await self.accept()
		
		# Get terminal service URL from environment
		terminal_base_url = os.environ.get('TERMINAL_SERVICE_URL', 'wss://portfolio-terminal-4t9w.onrender.com')
		if terminal_base_url.startswith('wss://'):
			# For production
			self.terminal_url = f"{terminal_base_url}/terminal/{self.project_slug}/"
		else:
			# For development or if base URL doesn't include protocol
			self.terminal_url = f"wss://{terminal_base_url}/terminal/{self.project_slug}/"
		
		print(f"Connecting to terminal service at: {self.terminal_url}")
		self.terminal_url = f"{terminal_base_url}/terminal/{self.project_slug}/"
		
		try:
			# Connect to terminal service
			self.terminal_ws = await websockets.connect(self.terminal_url)
			
			# Start forwarding messages from terminal to browser
			self.forward_task = asyncio.create_task(self.forward_from_terminal())
			
			# Send welcome message
			await self.send(text_data=json.dumps({
				'output': f"Connecting to terminal for {self.project_slug}...\r\n"
			}))
			
		except Exception as e:
			# Handle connection errors
			error_msg = f"Error connecting to terminal service: {str(e)}\r\n"
			await self.send(text_data=json.dumps({'output': error_msg}))
			await self.close()

	async def disconnect(self, close_code):
		# Clean up terminal connection when browser disconnects
		if hasattr(self, 'terminal_ws'):
			try:
				await self.terminal_ws.close()
			except Exception as e:
				print(f"Error closing terminal connection: {e}")
		
		# Cancel forwarding task if active
		if hasattr(self, 'forward_task') and not self.forward_task.done():
			self.forward_task.cancel()

	async def forward_from_terminal(self):
		try:
			while True:
				message = await self.terminal_ws.recv()
				print(f"Forwarding from terminal to client: {message[:30]}...")
				await self.send(text_data=message)
		except websockets.ConnectionClosed as e:
			print(f"Error in forward_from_terminal: {e}")
			await self.send(text_data=json.dumps({
				'output': '\r\n\r\nTerminal connection closed. Refresh to reconnect.\r\n'
			}))
		except Exception as e:
			await self.send(text_data=json.dumps({
				'output': f'\r\n\r\nTerminal error: {str(e)}\r\n'
			}))
		finally:
			# Close the WebSocket connection when forwarding ends
			if not self.is_closed():
				await self.close()
				
	async def receive(self, text_data):
		if hasattr(self, 'terminal_ws'):
			try:
				# Check connection is still open by attempting to send
				await self.terminal_ws.send(text_data)
			except websockets.exceptions.ConnectionClosed:
				# Handle closed connection
				await self.send(text_data=json.dumps({
					'output': '\r\nTerminal connection lost, please refresh.\r\n'
				}))

class HealthCheckConsumer(AsyncWebsocketConsumer):
	async def connect(self):
		await self.accept()
		await self.send(text_data=json.dumps({
			'status': 'healthy',
			'service': 'websocket'
		}))
		await self.close()