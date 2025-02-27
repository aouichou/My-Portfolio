# projects/views.py

from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Project
from .serializers import ProjectSerializer
from rest_framework.views import APIView
from rest_framework import status
from .serializers import ContactSubmissionSerializer
from django_ratelimit.decorators import ratelimit
from django.core.mail import send_mail
from django.conf import settings
from django.utils.decorators import method_decorator

class ProjectList(generics.ListAPIView):
	queryset = Project.objects.all()
	serializer_class = ProjectSerializer

class ProjectDetail(generics.RetrieveAPIView):
    queryset = Project.objects.prefetch_related('gallery')
    serializer_class = ProjectSerializer
    lookup_field = 'slug'

@api_view(['GET', 'POST'])
@ratelimit(key='ip', rate='60/m')
def project_by_slug(request):
    if request.method == 'POST':
        slug = request.data.get('slug')
    else:
        slug = request.GET.get('slug')
    
    if not slug:
        return Response({'error': 'Slug is required'}, status=400)
    
    project = get_object_or_404(
        Project.objects.prefetch_related('gallery'), 
        slug=slug
    )
    serializer = ProjectSerializer(project, context={'request': request})
    return Response(serializer.data)

class ContactSubmissionView(APIView):
    @method_decorator(ratelimit(key='ip', rate='5/m', method=['POST']))
    def post(self, request):
        was_limited = getattr(request, 'limited', False)
        if was_limited:
            return Response(
                {'error': 'Too many requests, please try again later.'}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        serializer = ContactSubmissionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            try:
                send_mail(
                    'New Portfolio Contact',
                    f'New message from {serializer.data["name"]} ({serializer.data["email"]}):\n\n{serializer.data["message"]}',
                    settings.DEFAULT_FROM_EMAIL,
                    [settings.CONTACT_EMAIL],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Email error: {e}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)