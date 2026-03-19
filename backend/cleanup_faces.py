import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Face

def cleanup_faces(option="all"):
    """
    Options: 
    'all' - Deletes ALL face detections.
    'zeros' - Deletes only those with 0.0 embeddings (legacy/fallback).
    """
    print(f"--- Face Data Cleanup (Mode: {option}) ---")
    
    if option == "zeros":
        # Find faces where the sum of absolute values in embedding is 0
        all_faces = Face.objects.all()
        to_delete = []
        for face in all_faces:
            if sum([abs(x) for x in face.embedding]) == 0:
                to_delete.append(face.id)
        
        count = len(to_delete)
        Face.objects.filter(id__in=to_delete).delete()
        print(f"✅ Deleted {count} legacy (zero-vector) face entries.")
    
    elif option == "all":
        count = Face.objects.count()
        Face.objects.all().delete()
        print(f"✅ Deleted ALL {count} face entries from the database.")
    
    print("Database is now clean for fresh AI processing!")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["all", "zeros"], default="all", help="all: delete everything, zeros: delete only fallbacks")
    args = parser.parse_args()
    
    cleanup_faces(args.mode)
