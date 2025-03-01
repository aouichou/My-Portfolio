from django.http import JsonResponse
from django.db import connection

def health_check(request):
    # Check database connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            one = cursor.fetchone()[0]
            if one != 1:
                return JsonResponse({"status": "error", "message": "Database test failed"}, status=500)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
    
    # Return success response
    return JsonResponse({"status": "ok", "message": "Service is healthy"})