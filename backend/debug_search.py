import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Face, Media
from api.ai_processor import extract_face_encodings, compare_embeddings
import numpy as np

def test_search_logic():
    print("Testing Face Search Logic...")
    
    # 1. Check if we have any faces in DB
    all_faces = Face.objects.exclude(embedding__isnull=True)
    if not all_faces.exists():
        print("Error: No faces in database to search against. Upload some first!")
        return

    # 2. Pick a face from DB to simulate a search
    test_face = all_faces.first()
    query_encoding = test_face.embedding
    print(f"Querying with face ID {test_face.id} (Person: {test_face.person_name})")

    # 3. Simulate view logic
    face_ids = []
    embeddings = []
    for f in all_faces:
        face_ids.append(f.id)
        embeddings.append(f.embedding)
    
    print(f"Total faces to compare: {len(embeddings)}")
    
    try:
        matched_indices = compare_embeddings(query_encoding, embeddings)
        matched_face_ids = [face_ids[i] for i in matched_indices]
        print(f"Matches found: {matched_face_ids}")
        
        media_ids = Face.objects.filter(id__in=matched_face_ids).values_list('media_id', flat=True)
        media_qs = Media.objects.filter(media_id__in=media_ids).distinct()
        print(f"Media count: {media_qs.count()}")
        print("SUCCESS: Internal logic works.")
    except Exception as e:
        print(f"FAILURE in internal logic: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_search_logic()
