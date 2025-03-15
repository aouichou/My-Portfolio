# portfolio_api/middleware.py

from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponseForbidden
from django.core.cache import cache
from django.utils import timezone

class SecurityHeadersMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=()'
        return response

class TerminalSecurityMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_commands = {'make', 'gcc', 'python3', 'npm'}
        self.blocked_patterns = {'rm ', 'sudo', 'ssh'}

    def __call__(self, request):
        if request.path.startswith('/ws/'):
            command = request.GET.get('cmd', '')
            if any(blocked in command for blocked in self.blocked_patterns):
                return HttpResponseForbidden("Command blocked")
            if not any(allowed in command for allowed in self.allowed_commands):
                return HttpResponseForbidden("Command not permitted")
        return self.get_response(request)
    
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