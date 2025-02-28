# portfolio_api/projects/views.py

from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from .models import Project, Gallery, GalleryImage
from .serializers import ProjectSerializer, ContactSubmissionSerializer
from django.db.models import Prefetch

class ProjectList(generics.ListAPIView):
    queryset = Project.objects.prefetch_related(
        Prefetch('galleries', queryset=Gallery.objects.prefetch_related('images').order_by('order'))
    ).filter(is_featured=True)
    serializer_class = ProjectSerializer
    filterset_fields = ['is_featured']

class ProjectDetail(generics.RetrieveAPIView):
    queryset = Project.objects.prefetch_related(
        Prefetch('galleries', 
                 queryset=Gallery.objects.prefetch_related('images').order_by('order'))
    )
    lookup_field = 'slug'
    serializer_class = ProjectSerializer

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
        Project.objects.prefetch_related('galleries__images'),
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
            submission = serializer.save()
            try:
                send_mail(
                    'New Portfolio Contact',
                    f'New message from {submission.name} ({submission.email}):\n\n{submission.message}',
                    settings.EMAIL_HOST_USER,
                    [settings.CONTACT_RECIPIENT],
                    fail_silently=False,
                )
            except Exception as e:
                print(f"Email error: {e}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)