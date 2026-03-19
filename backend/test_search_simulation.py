import os
import django
import sys
import numpy as np

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Face, Media
from api.ai_processor import compare_embeddings

def test_search_simulation():
    print("--- Face Search Simulation Test ---")
    
    # Pick a face from DB to simulate a query
    query_face = Face.objects.exclude(embedding=[0.0]*128).first()
    if not query_face:
        print("No non-zero faces in DB to test with.")
        return

    print(f"Using Face ID {query_face.id} (Media: {query_face.media_id}) as query.")
    query_encoding = query_face.embedding
    room_id = query_face.media.room_id
    
    # Fetch all faces in that room
    all_faces = Face.objects.filter(media__room_id=room_id).exclude(embedding__isnull=True)
    face_ids = []
    embeddings = []
    for f in all_faces:
        face_ids.append(f.id)
        embeddings.append(f.embedding)
    
    print(f"Comparing against {len(embeddings)} faces in room {room_id}")
    
    matched_indices = compare_embeddings(query_encoding, embeddings, threshold=0.6)
    print(f"Matches found: {len(matched_indices)}")
    
    for idx in matched_indices:
        print(f"  - Match: Face ID {face_ids[idx]} (Media: {all_faces[idx].media_id})")

    if query_face.id in [face_ids[i] for i in matched_indices]:
        print("✅ SUCCESS: Query face found itself in results.")
    else:
        print("❌ FAILURE: Query face not found in results (even with itself!)")

if __name__ == "__main__":
    test_search_simulation()
