from django.shortcuts import render
from django.db.models import Q, Case, When, Value, IntegerField

from django.http import HttpResponse, FileResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from django.shortcuts import get_object_or_404
from .models import Media, Tag, Room, RoomMember, Face
from .serializers import MediaSerializer, RoomSerializer, UserSerializer, FaceSerializer
from .ai_processor import process_image_ai, extract_face_encodings, compare_embeddings, FACE_REC_AVAILABLE, generate_clip_embedding, get_text_embedding
import os
import json
import io
import zipfile
import mimetypes
import numpy as np
from django.conf import settings
from PIL import Image
import sys 
import requests # Added requests for external API
try:
    import face_recognition
    import dlib
    import cv2
except ImportError:
    print("WARNING: face_recognition or cv2 not found in views.py")

# MODULE LEVEL LOGGING
sys.stderr.write("\n\n!!! VIEWS.PY MODULE LOADED !!!\n\n")



class MediaUploadView(APIView):
    def post(self, request, *args, **kwargs):
        media_file = request.FILES.get('image') # Frontend still sends as 'image' for now
        room_id = request.data.get('room_id')
        user = request.user if request.user.is_authenticated else None

        if not media_file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # Detect media type
        mime_type, _ = mimetypes.guess_type(media_file.name)
        is_video = mime_type and mime_type.startswith('video')
        media_type = 'video' if is_video else 'image'

        # 1. Save Media
        media_obj = Media.objects.create(
            user=user,
            room_id=room_id,
            image=media_file,
            media_type=media_type
        )
        
        # 2. Generate Optimized Versions / Thumbnails
        try:
            from PIL import Image
            import io
            from django.core.files.base import ContentFile
            import os

            file_path = media_obj.image.path
            
            def get_content_file(image_obj, format='JPEG', quality=85):
                buf = io.BytesIO()
                image_obj.save(buf, format=format, quality=quality)
                return ContentFile(buf.getvalue())

            if not is_video:
                # IMAGE PROCESSING
                img = Image.open(file_path)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")

                # A. Thumbnail (~300px)
                thumb_img = img.copy()
                thumb_img.thumbnail((300, 300))
                thumb_name = os.path.basename(file_path).rsplit('.', 1)[0] + "_thumb.jpg"
                media_obj.thumbnail.save(thumb_name, get_content_file(thumb_img), save=False)

                # B. Medium (~1200px)
                medium_img = img.copy()
                medium_img.thumbnail((1200, 1200))
                medium_name = os.path.basename(file_path).rsplit('.', 1)[0] + "_medium.jpg"
                media_obj.medium.save(medium_name, get_content_file(medium_img), save=False)

                # C. WebP Version
                webp_name = os.path.basename(file_path).rsplit('.', 1)[0] + ".webp"
                media_obj.webp.save(webp_name, get_content_file(medium_img, format='WEBP'), save=False)
            else: # This is the video processing block
                # VIDEO PROCESSING - Extract first frame for thumbnail
                import cv2
                cap = cv2.VideoCapture(file_path)
                success, frame = cap.read()
                if success:
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    img = Image.fromarray(frame_rgb)
                    
                    # Store as thumbnail
                    thumb_img = img.copy()
                    thumb_img.thumbnail((400, 400)) # Slightly larger for video
                    thumb_name = os.path.basename(file_path).rsplit('.', 1)[0] + "_vthumb.jpg"
                    media_obj.thumbnail.save(thumb_name, get_content_file(thumb_img), save=False)
                cap.release()

                # SYNC WITH EXTERNAL VIDEO API
                try:
                    EXTERNAL_API_URL = "http://10.212.243.134:5000/upload"
                    sync_log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sync_debug.txt')
                    with open(sync_log_path, 'a') as sl:
                        sl.write(f"Attempting sync for Media {media_obj.media_id}...\n")
                        with open(file_path, 'rb') as f:
                            files = {'file': (os.path.basename(file_path), f)}
                            # Increase timeout for upload to 60s
                            response = requests.post(EXTERNAL_API_URL, files=files, timeout=60)
                            sl.write(f"External upload response: {response.status_code}\n")
                            if response.status_code == 200:
                                data = response.json()
                                media_obj.external_id = data.get('video_id')
                                # CRITICAL: Save immediately so we don't lose this ID even if subsequent AI fails
                                media_obj.save()
                                sl.write(f"Successfully saved ExtID {media_obj.external_id} for Media {media_obj.media_id}\n")
                            else:
                                sl.write(f"Sync failed. Status: {response.status_code}, Body: {response.text[:100]}\n")
                except Exception as e:
                    with open(sync_log_path, 'a') as sl:
                        sl.write(f"Sync exception: {str(e)}\n")
                    print(f"Error syncing with external video API: {e}")

            media_obj.save()
        except Exception as e:
            print(f"Error generating optimized media: {e}")

        # AI Processing (Only for images)
        if not is_video:
            image_path = media_obj.image.path
            
            # 3. General AI Processing (Tags)
            try:
                tags_list = process_image_ai(image_path)
                for tag_name in tags_list:
                    tag_obj, created = Tag.objects.get_or_create(tag_name=tag_name)
                    media_obj.tags.add(tag_obj)
            except Exception as e:
                print(f"AI Tagging error: {e}")
                
            # 4. Face Detection
            try:
                face_data = extract_face_encodings(image_path)
                def get_next_person_name(room_id):
                    named_faces = Face.objects.filter(media__room_id=room_id, person_name__startswith="Person ")
                    max_n = 0
                    for f in named_faces:
                        try:
                            parts = f.person_name.split(" ")
                            if len(parts) > 1:
                                n = int(parts[1])
                                if n > max_n: max_n = n
                        except (ValueError, IndexError): continue
                    return f"Person {max_n + 1}"

                for face in face_data:
                    new_encoding = face['encoding']
                    person_name = None
                    room_faces = list(Face.objects.filter(media__room_id=room_id).exclude(embedding__isnull=True))
                    if room_faces:
                        embeddings = [f.embedding for f in room_faces]
                        matched_indices = compare_embeddings(new_encoding, embeddings)
                        if matched_indices:
                            for idx in matched_indices:
                                if room_faces[idx].person_name:
                                    person_name = room_faces[idx].person_name
                                    break
                            if not person_name:
                                person_name = get_next_person_name(room_id)
                                match_face = room_faces[matched_indices[0]]
                                match_face.person_name = person_name
                                match_face.save()
                    if not person_name:
                        person_name = get_next_person_name(room_id)

                    Face.objects.create(
                        media=media_obj,
                        embedding=new_encoding,
                        location_data=face['location'],
                        person_name=person_name
                    )
                    tag_obj, _ = Tag.objects.get_or_create(tag_name=person_name)
                    media_obj.tags.add(tag_obj)
            except Exception as e:
                print(f"AI Face detection error: {e}")
                
            # 5. CLIP Semantic Embedding
            try:
                clip_emb = generate_clip_embedding(image_path)
                if clip_emb:
                    media_obj.clip_embedding = clip_emb
                    media_obj.save()
            except Exception as e:
                print(f"AI CLIP error: {e}")
        else:
            # Video specific tags
            tag_obj, _ = Tag.objects.get_or_create(tag_name='video')
            media_obj.tags.add(tag_obj)
            
        return Response(MediaSerializer(media_obj).data, status=status.HTTP_201_CREATED)

class FaceNameView(APIView):
    """
    API to assign a name to a detected face.
    """
    def post(self, request, face_id):
        person_name = request.data.get('person_name')
        if not person_name:
            return Response({"error": "person_name is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            face = Face.objects.get(id=face_id)
            face.person_name = person_name
            face.save()
            return Response({"message": f"Face assigned to {person_name}"})
        except Face.DoesNotExist:
            return Response({"error": "Face not found"}, status=status.HTTP_404_NOT_FOUND)

class FaceNamesView(APIView):
    """
    API to list all unique person names (clusters) in a room.
    Useful for filtering tags in the UI.
    """
    def get(self, request):
        room_id = request.query_params.get('room_id')
        if not room_id:
            return Response({"error": "room_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Find all unique person names in this room
        names = Face.objects.filter(
            media__room_id=room_id
        ).exclude(person_name__isnull=True).exclude(person_name="").values_list('person_name', flat=True).distinct()
        
        return Response({"person_names": list(names)})

class ClusterRenameView(APIView):
    """
    API to rename an entire cluster of faces and update associated tags.
    """
    def post(self, request):
        room_id = request.data.get('room_id')
        old_name = request.data.get('old_name')
        new_name = request.data.get('new_name')

        if not all([room_id, old_name, new_name]):
            return Response({"error": "room_id, old_name, and new_name are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Robust Room lookup
        room_obj = None
        try:
            import uuid
            try:
                val = uuid.UUID(room_id)
                room_obj = Room.objects.filter(room_id=val).first()
            except (ValueError, TypeError):
                room_obj = Room.objects.filter(room_code=room_id).first()
        except Exception as e:
            print(f"Error in Room lookup: {e}")

        if not room_obj:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        # 1. Update all Faces
        faces_updated = Face.objects.filter(
            media__room=room_obj,
            person_name__iexact=old_name
        ).update(person_name=new_name)
        
        print(f"DEBUG: Renaming '{old_name}' to '{new_name}' in room {room_obj.room_code}. Faces updated: {faces_updated}")

        # 2. Update Tags
        media_count = 0
        try:
            old_tag = Tag.objects.filter(tag_name__iexact=old_name).first()
            if old_tag:
                new_tag_obj, _ = Tag.objects.get_or_create(tag_name=new_name)
                media_with_old_tag = Media.objects.filter(
                    room=room_obj,
                    tags=old_tag
                )
                media_count = media_with_old_tag.count()
                for m in media_with_old_tag:
                    m.tags.remove(old_tag)
                    m.tags.add(new_tag_obj)
        except Exception as e:
            print(f"Error updating tags: {e}")

        return Response({
            "message": f"Renamed '{old_name}' to '{new_name}'",
            "faces_affected": faces_updated,
            "media_affected": media_count
        })

class FaceCropView(APIView):
    """
    API to serve a cropped face image for a given person_name in a room.
    """
    def get(self, request):
        room_id = request.query_params.get('room_id')
        person_name = request.query_params.get('person_name')
        
        with open("face_request_log.txt", "a") as f:
            f.write(f"REQUEST: room_id={room_id} person_name='{person_name}'\n")

        if not all([room_id, person_name]):
            return Response({"error": "room_id and person_name are required"}, status=status.HTTP_400_BAD_REQUEST)

        # Better Room lookup
        room_obj = None
        try:
            from .models import Room
            import uuid
            # Check if it's a valid UUID
            try:
                val = uuid.UUID(room_id)
                room_obj = Room.objects.filter(room_id=val).first()
            except ValueError:
                # Not a UUID, try as room_code
                room_obj = Room.objects.filter(room_code=room_id).first()
        except Exception as e:
            print(f"DEBUG FaceCropView: Room lookup error: {e}")

        if not room_obj:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        # Find the first face for this person in this room
        # Case 1: Match by person_name
        face = Face.objects.filter(
            media__room=room_obj,
            person_name__iexact=person_name
        ).first()
        
        # Case 2: Fallback - if no exact face name, try to find a face in media that has this tag
        if not face:
            # This handles cases where tags were not synced correctly or person was renamed
            face = Face.objects.filter(
                media__room=room_obj,
                media__tags__tag_name__iexact=person_name
            ).first()

        if not face:
            return Response({"error": "No face found for this person"}, status=status.HTTP_404_NOT_FOUND)

        image_path = face.media.image.path
        if not os.path.exists(image_path):
            return Response({"error": "Original image not found"}, status=status.HTTP_404_NOT_FOUND)

        # Crop the face
        try:
            img = cv2.imread(image_path)
            if img is None:
                return Response({"error": "Failed to read image"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # location_data is [top, right, bottom, left]
            # Ensure it's a list/tuple
            loc = face.location_data
            if isinstance(loc, str):
                import json
                loc = json.loads(loc)
            
            top, right, bottom, left = loc
            
            # Add some padding (30%) for a better avatar look
            h, w, _ = img.shape
            face_h = bottom - top
            face_w = right - left
            pad = int(max(face_h, face_w) * 0.3)
            
            top = max(0, top - pad)
            bottom = min(h, bottom + pad)
            left = max(0, left - pad)
            right = min(w, right + pad)

            crop = img[top:bottom, left:right]
            
            # Convert to JPEG
            _, buffer = cv2.imencode('.jpg', crop)
            return HttpResponse(buffer.tobytes(), content_type="image/jpeg")
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FaceSearchView(APIView):
    """
    Search by Face Image OR Person Name.
    """
    def post(self, request):
        print(f"Face search triggered. Data keys: {list(request.data.keys())}, Files: {list(request.FILES.keys())}")
        room_id = request.data.get('room_id')
        
        # Option 1: Search by Name
        person_name = request.data.get('person_name')
        if person_name:
            # Optimize for room_id if provided
            media_ids_qs = Face.objects.filter(person_name__icontains=person_name)
            if room_id:
                media_ids_qs = media_ids_qs.filter(media__room_id=room_id)
            media_ids = media_ids_qs.values_list('media_id', flat=True)
            media_qs = Media.objects.filter(media_id__in=media_ids).distinct()
            print(f"Name search for '{person_name}' in room {room_id} returned {media_qs.count()} results")
            return Response(MediaSerializer(media_qs, many=True).data)

        # Option 2: Search by Image Upload
        search_image = request.FILES.get('image')
        if search_image:
            # Temporary save space
            from django.core.files.storage import default_storage
            from django.core.files.base import ContentFile
            
            try:
                # Ensure we read from the beginning
                search_image.seek(0)
                file_content = search_image.read()
                temp_path = default_storage.save('temp_search.jpg', ContentFile(file_content))
                full_temp_path = os.path.join(settings.MEDIA_ROOT, temp_path)
                print(f"Temporary search image saved at: {full_temp_path} (Size: {len(file_content)} bytes)")
                
                # Extract encoding for the query face
                query_faces = extract_face_encodings(full_temp_path)
                if not query_faces:
                    print(f"Detection failed for query image: {full_temp_path}")
                    return Response({"error": "No face detected in query image"}, status=status.HTTP_400_BAD_REQUEST)
                
                query_encoding = query_faces[0]['encoding'] # Use first face detected
                
                # Fetch face embeddings only for the relevant room
                all_faces = Face.objects.exclude(embedding__isnull=True)
                if room_id:
                    all_faces = all_faces.filter(media__room_id=room_id)
                
                face_ids = []
                embeddings = []
                for f in all_faces:
                    face_ids.append(f.id)
                    embeddings.append(f.embedding)
                
                if not embeddings:
                    print(f"No faces found to compare in room {room_id}")
                    return Response([], status=status.HTTP_200_OK)

                matched_indices = compare_embeddings(query_encoding, embeddings)
                print(f"Comparison finished. Found {len(matched_indices)} matches out of {len(embeddings)} faces.")
                matched_face_ids = [face_ids[i] for i in matched_indices]
                
                media_ids = Face.objects.filter(id__in=matched_face_ids).values_list('media_id', flat=True)
                media_qs = Media.objects.filter(media_id__in=media_ids).distinct()
                # Redundant but safe
                if room_id:
                    media_qs = media_qs.filter(room_id=room_id)
                
                print(f"Image search found {media_qs.count()} matching photos in room {room_id}")
                return Response(MediaSerializer(media_qs, many=True).data)
            except Exception as e:
                print(f"Face Search Error: {e}")
                import traceback
                traceback.print_exc()
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                if os.path.exists(full_temp_path):
                    os.remove(full_temp_path)

        return Response({"error": "Provide either person_name or image"}, status=status.HTTP_400_BAD_REQUEST)

class SearchView(APIView):
    def get(self, request):
        tag_query = request.query_params.get('tag')
        text_query = request.query_params.get('text')
        room_id = request.query_params.get('room_id')
        
        # New filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        media_type = request.query_params.get('type')
        category = request.query_params.get('category')
        
        # Granular date filters
        spec_day = request.query_params.get('day')
        spec_month = request.query_params.get('month')
        spec_year = request.query_params.get('year')
        
        media_qs = Media.objects.all()
        
        if room_id:
            media_qs = media_qs.filter(room_id=room_id)
            
        # Apply Filters
        if date_from:
            media_qs = media_qs.filter(upload_time__date__gte=date_from)
        if date_to:
            media_qs = media_qs.filter(upload_time__date__lte=date_to)
            
        if spec_day:
            media_qs = media_qs.filter(upload_time__day=spec_day)
        if spec_month:
            # Month can be 1-12 or YYYY-MM. Handle both.
            if '-' in spec_month:
                y, m = spec_month.split('-')
                media_qs = media_qs.filter(upload_time__year=y, upload_time__month=m)
            else:
                media_qs = media_qs.filter(upload_time__month=spec_month)
        if spec_year:
            media_qs = media_qs.filter(upload_time__year=spec_year)
        if media_type:
            media_qs = media_qs.filter(image__icontains=f".{media_type}")
        if category:
            if category == 'documents':
                media_qs = media_qs.filter(tags__tag_name__in=['receipt', 'invoice', 'document', 'text_detected'])
            elif category == 'people':
                media_qs = media_qs.filter(detected_faces__isnull=False)
        
        query = tag_query or text_query
        if query:
            # Ranking / Relevance Scoring
            media_qs = media_qs.annotate(
                relevance=Case(
                    When(tags__tag_name__iexact=query, then=Value(10)),
                    When(detected_faces__person_name__iexact=query, then=Value(8)),
                    When(tags__tag_name__icontains=query, then=Value(5)),
                    default=Value(0),
                    output_field=IntegerField(),
                )
            ).filter(relevance__gt=0).order_by('-relevance', '-upload_time')
        else:
            media_qs = media_qs.order_by('-upload_time')
            
        serializer = MediaSerializer(media_qs.distinct(), many=True)
        return Response(serializer.data)

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def create(self, request, *args, **kwargs):
        import string, random
        room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        room = Room.objects.create(
            room_code=room_code,
            creator=request.user if request.user and request.user.is_authenticated else None
        )
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)

    def join_room(self, request):
        room_code = request.data.get('room_code')
        user = request.user
        
        try:
            room = Room.objects.get(room_code=room_code)
            if user and user.is_authenticated:
                RoomMember.objects.get_or_create(room=room, user=user)
            return Response({"message": "Joined room successfully", "room_id": room.room_id})
        except Room.DoesNotExist:
            return Response({"error": "Invalid room code"}, status=status.HTTP_404_NOT_FOUND)

class AIHealthCheckView(APIView):
    def get(self, request):
        return Response({
            "face_recognition_available": FACE_REC_AVAILABLE,
            "face_recognition_version": face_recognition.__version__ if FACE_REC_AVAILABLE else None,
            "dlib_version": dlib.__version__ if FACE_REC_AVAILABLE else None,
            "dlib_cuda": dlib.DLIB_USE_CUDA if FACE_REC_AVAILABLE else None,
            "opencv_version": os.environ.get('OPENCV_VERSION', 'Check logs'),
            "clip_available": CLIP_AVAILABLE
        })

class SemanticSearchView(APIView):
    """
    Search by natural language query using CLIP.
    """
    def get(self, request):
        query = request.query_params.get('query')
        room_id = request.query_params.get('room_id')
        
        if not query:
            return Response({"error": "query is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        q_emb = get_text_embedding(query)
        if not q_emb:
            return Response({"error": "CLIP model not available"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Fetch all media with embeddings for this room
        media_qs = Media.objects.exclude(clip_embedding__isnull=True)
        if room_id:
            media_qs = media_qs.filter(room_id=room_id)
            
        if not media_qs.exists():
            return Response([])

        # Calculate similarity (optimized matrix multiplication)
        media_list = list(media_qs)
        m_vecs = np.array([m.clip_embedding for m in media_list])
        q_vec = np.array(q_emb)
        
        # Normalize vectors for cosine similarity
        q_norm = np.linalg.norm(q_vec)
        m_norms = np.linalg.norm(m_vecs, axis=1)
        
        # Avoid division by zero
        q_vec = q_vec / (q_norm + 1e-8)
        m_vecs = m_vecs / (m_norms[:, np.newaxis] + 1e-8)
        
        # Dot product of normalized vectors = Cosine Similarity
        similarities = np.dot(m_vecs, q_vec)
        
        # Build results with similarity and apply filters
        final_results = []
        
        # New filters for Semantic Search
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        media_type = request.query_params.get('type')
        
        spec_day = request.query_params.get('day')
        spec_month = request.query_params.get('month')
        spec_year = request.query_params.get('year')
        
        for i, m in enumerate(media_list):
            sim = float(similarities[i])
            if sim > 0.05:
                # Apply same filtering logic as SearchView
                if date_from and m.upload_time.date().isoformat() < date_from: continue
                if date_to and m.upload_time.date().isoformat() > date_to: continue
                
                if spec_day and m.upload_time.day != int(spec_day): continue
                if spec_month:
                    if '-' in spec_month:
                        y, mon = map(int, spec_month.split('-'))
                        if m.upload_time.year != y or m.upload_time.month != mon: continue
                    elif m.upload_time.month != int(spec_month): continue
                if spec_year and m.upload_time.year != int(spec_year): continue
                
                if media_type and f".{media_type}" not in m.image.name.lower(): continue
                
                final_results.append((m, sim))
            
        # Sort by similarity (descending)
        final_results.sort(key=lambda x: x[1], reverse=True)
        top_results = final_results[:30]
        
        # Build response with similarity scores
        data = []
        for m, s in top_results:
            serialized = MediaSerializer(m).data
            serialized['similarity'] = s
            data.append(serialized)
            
        return Response(data)

class VideoMomentSearchView(APIView):
    """
    Searches for moments inside videos using the external CLIP-based API.
    """
    def get(self, request):
        query = request.query_params.get('q')
        room_id = request.query_params.get('room_id')
        
        if not query:
            return Response({"error": "query (q) is required"}, status=400)
            
        with open('search_debug.txt', 'a') as f:
            f.write(f"\n--- Search Triggered: {query} (Room Filter: {room_id}) ---\n")
            try:
                EXTERNAL_SEARCH_URL = "http://10.212.243.134:5000/search"
                # Increase timeout to 60s for intensive CLIP search
                response = requests.get(EXTERNAL_SEARCH_URL, params={'q': query}, timeout=60)
                
                if response.status_code != 200:
                    f.write(f"External API error: {response.status_code}\n")
                    return Response({"error": f"External search API failed ({response.status_code})"}, status=502)
                    
                results = response.json().get('results', [])
                f.write(f"Raw External Results: {results}\n")
                
                # Map external results to local Media objects
                final_results = []
                mismatched_results = []
                
                for res in results:
                    ext_id = res.get('id')
                    media = Media.objects.filter(external_id=ext_id).first()
                    if media:
                        serialized = MediaSerializer(media).data
                        serialized['moment_timestamp'] = res.get('timestamp')
                        serialized['similarity'] = res.get('similarity')
                        serialized['stream_url'] = f"http://10.212.243.134:5000/stream/{ext_id}"
                        
                        # Check room
                        if not room_id or str(media.room_id) == room_id:
                            final_results.append(serialized)
                        else:
                            mismatched_results.append(serialized)
                    else:
                        f.write(f"Could NOT match ext_id {ext_id} to any local Media\n")
                
                # If no results in current room, but some exist elsewhere, return them for now
                # BUT only if we are in this relaxed debug mode. 
                # For long-term, we should stick to room filtering.
                if not final_results and mismatched_results:
                    f.write(f"Falling back to {len(mismatched_results)} results from other rooms.\n")
                    final_results = mismatched_results
                
                f.write(f"Final results count: {len(final_results)}\n")
                return Response(final_results)
            except Exception as e:
                f.write(f"Search exception: {str(e)}\n")
                return Response({"error": f"Search failed: {str(e)}"}, status=500)


