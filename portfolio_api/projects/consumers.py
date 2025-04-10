# In portfolio_api/projects/consumers.py

import websockets
from channels.generic.websocket import AsyncWebsocketConsumer
import json
import os
import asyncio
import logging

# Set up logging
logger = logging.getLogger(__name__)

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
        
        logger.info(f"Connecting to terminal service at: {self.terminal_url}")
        
        try:
            # Connect to terminal service with a timeout
            # Increased timeout to handle the large file download
            self.terminal_ws = await asyncio.wait_for(
                websockets.connect(self.terminal_url, ping_interval=30, ping_timeout=120),
                timeout=60  # 60-second connection timeout
            )
            
            # Start forwarding messages from terminal to browser
            self.forward_task = asyncio.create_task(self.forward_from_terminal())
            
            # Send welcome message
            await self.send(text_data=json.dumps({
                'output': f"Connecting to terminal for {self.project_slug}...\r\n"
            }))
            
        except asyncio.TimeoutError:
            error_msg = f"Connection to terminal service timed out after 60 seconds\r\n"
            logger.error(error_msg)
            await self.send(text_data=json.dumps({'output': error_msg}))
            await self.close()
        except Exception as e:
            # Handle connection errors
            error_msg = f"Error connecting to terminal service: {str(e)}\r\n"
            logger.error(f"Terminal connection error: {e}")
            await self.send(text_data=json.dumps({'output': error_msg}))
            await self.close()

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnecting with code: {close_code}")
        # Clean up terminal connection when browser disconnects
        if hasattr(self, 'terminal_ws'):
            try:
                await self.terminal_ws.close()
                logger.info("Terminal WebSocket connection closed")
            except Exception as e:
                logger.error(f"Error closing terminal connection: {e}")
        
        # Cancel forwarding task if active
        if hasattr(self, 'forward_task') and not self.forward_task.done():
            self.forward_task.cancel()
            try:
                await self.forward_task
                logger.info("Forward task cancelled")
            except asyncio.CancelledError:
                logger.info("Forward task was cancelled")

    async def forward_from_terminal(self):
        try:
            while True:
                try:
                    message = await asyncio.wait_for(
                        self.terminal_ws.recv(),
                        timeout=300  # 5-minute timeout for receiving messages
                    )
                    logger.debug(f"Forwarding terminal message: {message[:30]}...")
                    await self.send(text_data=message)
                except asyncio.TimeoutError:
                    # Send a ping to keep the connection alive
                    logger.info("Terminal read timeout - sending ping")
                    await self.terminal_ws.ping()
                    await self.send(text_data=json.dumps({
                        'output': '\r\n[Terminal connection is still active...]\r\n'
                    }))
        except websockets.ConnectionClosed as e:
            logger.warning(f"Terminal WebSocket closed with code {e.code}: {e.reason}")
            try:
                await self.send(text_data=json.dumps({
                    'output': '\r\n\r\nTerminal connection closed. Refresh to reconnect.\r\n'
                }))
            except:
                # Connection might already be closed
                logger.error("Failed to notify client about closed terminal connection")
        except Exception as e:
            logger.error(f"Error in forward_from_terminal: {str(e)}", exc_info=True)
            try:
                await self.send(text_data=json.dumps({
                    'output': f'\r\n\r\nTerminal error: {str(e)}\r\n'
                }))
            except:
                # Connection might already be closed
                pass
        finally:
            # Close the WebSocket connection when forwarding ends
            try:
                # Replace the is_closed check with a direct try/except
                await self.close()
            except Exception:
                # Connection is likely already closed
                pass
                
    async def receive(self, text_data):
        if hasattr(self, 'terminal_ws'):
            try:
                # Check connection is still open by attempting to send
                await self.terminal_ws.send(text_data)
            except websockets.exceptions.ConnectionClosed:
                # Handle closed connection
                logger.warning("Terminal WebSocket closed when trying to send data")
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