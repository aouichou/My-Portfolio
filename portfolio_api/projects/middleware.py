# portfolio_api/middleware.py

from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponseForbidden
from django.core.cache import cache
from django.utils import timezone

class TerminalSecurityMiddleware:
	def __init__(self, get_response):
		self.get_response = get_response
		
	def __call__(self, request):
		# Only apply to regular HTTP endpoints, not WebSockets
		if request.path.startswith('/api/terminal/') and not request.path.startswith('/ws/'):
			command = request.GET.get('cmd', '')
			if self.is_dangerous_command(command):
				return HttpResponseForbidden("Command blocked")
		return self.get_response(request)
	
	def is_dangerous_command(self, command):
		blocked_patterns = {'rm -rf', 'sudo', 'ssh', '>', '|', ';'}
		return any(pattern in command for pattern in blocked_patterns)
	
class TerminalRateLimiter:
	def __init__(self, get_response):
		self.get_response = get_response

	def __call__(self, request):
		if request.path.startswith('/ws/terminal/'):
			ip = request.META.get('REMOTE_ADDR')
			key = f"terminal_limit_{ip}"
			count = cache.get(key, 0)
			
			if count > 10:  # 10 requests per minute
				return HttpResponseForbidden("Rate limit exceeded")
				
			cache.set(key, count + 1, 60)
			
		return self.get_response(request)

class WebSocketRateLimiter:
	def process_request(self, request):
		if request.path.startswith('/ws/'):
			key = f"ws_limit_{request.META['REMOTE_ADDR']}"
			count = cache.get(key, 0)
			if count > 30:  # 30 messages/second
				return HttpResponseForbidden("Rate limit exceeded")
			cache.set(key, count+1, 1)

class SecurityHeadersMiddleware(MiddlewareMixin):
	def process_response(self, request, response):
		response['X-Content-Type-Options'] = 'nosniff'
		response['X-Frame-Options'] = 'DENY'
		response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
		response['Permissions-Policy'] = 'geolocation=(), microphone=()'
		response['X-RateLimit-Limit'] = '60'
		# Get rate limit info if it's a websocket request
		if request.path.startswith('/ws/'):
			key = f"ws_limit_{request.META.get('REMOTE_ADDR', '')}"
			count = cache.get(key, 1)
			response['X-RateLimit-Remaining'] = str(60 - count)
		else:
			response['X-RateLimit-Remaining'] = '60'
		return response