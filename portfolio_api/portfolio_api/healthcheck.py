import logging

from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)

def health_check(request):
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            one = cursor.fetchone()[0]
            if one != 1:
                return JsonResponse({"status": "error", "message": "Database test failed"}, status=500)
    except Exception as e:
        # Log the actual error for debugging
        logger.error(f"Health check failed: {str(e)}")
        # Don't expose internal error details to users
        return JsonResponse({"status": "error", "message": "Database connection failed"}, status=500)
    
    # Return success response
    return JsonResponse({"status": "ok", "message": "Service is healthy"})