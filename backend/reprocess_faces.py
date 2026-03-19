import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Face, Media, Tag, Room
from api.ai_processor import extract_face_encodings, compare_embeddings

def get_next_person_name(room_id):
    named_faces = Face.objects.filter(media__room_id=room_id, person_name__startswith="Person ")
    max_n = 0
    for f in named_faces:
        try:
            parts = f.person_name.split(" ")
            if len(parts) > 1:
                n = int(parts[1])
                if n > max_n: max_n = n
        except (ValueError, IndexError):
            continue
    return f"Person {max_n + 1}"

def reprocess_room_faces(room_code):
    print(f"--- Reprocessing Faces for Room: {room_code} ---")
    try:
        room = Room.objects.get(room_code=room_code)
    except Room.DoesNotExist:
        print(f"Error: Room {room_code} not found.")
        return

    media_qs = Media.objects.filter(room=room)
    print(f"Found {media_qs.count()} media files to re-process.")

    for media in media_qs:
        print(f"  Processing Media: {media.media_id} ({os.path.basename(media.image.name)})")
        
        # 1. Remove existing faces and person tags for this media
        old_face_names = list(Face.objects.filter(media=media).values_list('person_name', flat=True))
        Face.objects.filter(media=media).delete()
        
        for name in old_face_names:
            if name:
                tag = Tag.objects.filter(tag_name=name).first()
                if tag:
                    media.tags.remove(tag)

        # 2. Re-run detection and clustering
        image_path = media.image.path
        face_data = extract_face_encodings(image_path)
        
        for face in face_data:
            new_encoding = face['encoding']
            person_name = None
            
            # Find possible matches in the same room (from newly created faces in this run)
            room_faces = list(Face.objects.filter(media__room_id=room.room_id).exclude(embedding__isnull=True))
            if room_faces:
                embeddings = [f.embedding for f in room_faces]
                matched_indices = compare_embeddings(new_encoding, embeddings)
                
                if matched_indices:
                    for idx in matched_indices:
                        if room_faces[idx].person_name:
                            person_name = room_faces[idx].person_name
                            break
                    
                    if not person_name:
                        person_name = get_next_person_name(room.room_id)
                        match_face = room_faces[matched_indices[0]]
                        match_face.person_name = person_name
                        match_face.save()
            
            if not person_name:
                person_name = get_next_person_name(room.room_id)

            Face.objects.create(
                media=media,
                embedding=new_encoding,
                location_data=face['location'],
                person_name=person_name
            )
            
            tag_obj, _ = Tag.objects.get_or_create(tag_name=person_name)
            media.tags.add(tag_obj)
            
        print(f"    Done. Detected {len(face_data)} faces.")

    print(f"--- Reprocessing Complete for {room_code} ---")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python reprocess_faces.py <ROOM_CODE>")
    else:
        reprocess_room_faces(sys.argv[1])
