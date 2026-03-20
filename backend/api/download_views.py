from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Media, Room, Tag
import os
import io
import zipfile
import mimetypes
from django.conf import settings
from PIL import Image
from django.http import FileResponse
from rest_framework.permissions import AllowAny

class DownloadMediaView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def get(self, request, media_id):
        media = get_object_or_404(Media, pk=media_id)
        
        file_type = request.query_params.get('type', 'original').lower()
        file_path = None
        content_type = 'application/octet-stream'
        filename = media.image.name.split('/')[-1]

        if file_type == 'thumbnail' and media.thumbnail:
            file_path = media.thumbnail.path
            filename = f"thumb_{filename}"
        elif file_type == 'medium' and media.medium:
            file_path = media.medium.path
            filename = f"medium_{filename}"
        elif file_type == 'webp' and media.webp:
            file_path = media.webp.path
            filename = f"{os.path.splitext(filename)[0]}.webp"
            content_type = 'image/webp'
        elif media.image:
            file_path = media.image.path
        else:
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        if not os.path.exists(file_path):
            return Response({"error": "File not found on server"}, status=status.HTTP_404_NOT_FOUND)

        if content_type == 'application/octet-stream':
            guessed_type, _ = mimetypes.guess_type(file_path)
            if guessed_type:
                content_type = guessed_type

        response = FileResponse(open(file_path, 'rb'), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

class BulkDownloadView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        media_ids = request.data.get('media_ids', [])
        if not media_ids:
            return Response({"error": "No media selected"}, status=status.HTTP_400_BAD_REQUEST)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zip_file:
            for m_id in media_ids:
                media = Media.objects.filter(pk=m_id).first()
                if media and media.image and os.path.exists(media.image.path):
                    zip_file.write(media.image.path, arcname=os.path.basename(media.image.name))

        buffer.seek(0)
        response = FileResponse(buffer, content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="photos.zip"'
        return response
