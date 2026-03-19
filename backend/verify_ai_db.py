import cv2
import os
import django
import sys
import numpy as np

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Face, Media

def verify_opencv():
    print("--- OpenCV Verification ---")
    print(f"OpenCV Version: {cv2.__version__}")
    
    # Test loading a cascade classifier (used in fallback)
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    if os.path.exists(cascade_path):
        print(f"✅ OpenCV Cascade Classifier found at: {cascade_path}")
    else:
        print(f"❌ OpenCV Cascade Classifier NOT found at: {cascade_path}")
        
    # Test basic image processing (creating a dummy image)
    try:
        dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
        gray = cv2.cvtColor(dummy_img, cv2.COLOR_BGR2GRAY)
        print("✅ Basic OpenCV image processing (BGR to Gray) working.")
    except Exception as e:
        print(f"❌ OpenCV processing failed: {e}")

def verify_database_analysis():
    print("\n--- Database Face Recognition Analysis ---")
    total_faces = Face.objects.count()
    print(f"Total Detected Faces in DB: {total_faces}")
    
    if total_faces > 0:
        # Check latest face
        latest_face = Face.objects.order_by('-created_at').first()
        print(f"\nLatest Face Analysis (ID: {latest_face.id}):")
        print(f"  - Linked Media: {latest_face.media.media_id}")
        print(f"  - Person Name: {latest_face.person_name or 'Unassigned'}")
        
        embedding = latest_face.embedding
        if embedding:
            emb_sum = sum([abs(x) for x in embedding])
            is_zero = emb_sum == 0
            print(f"  - Embedding Type: {type(embedding)}")
            print(f"  - Embedding Length: {len(embedding)}")
            print(f"  - Embedding Sum (Magnitude): {emb_sum}")
            if is_zero:
                print("  ⚠️ STATUS: This face has a ZERO embedding (Fallback/Legacy).")
            else:
                print("  ✅ STATUS: This face has a VALID 128-d embedding (AI Active).")
        else:
            print("  ❌ STATUS: No embedding found.")
    else:
        print("No face entries found in database. Upload a photo with a face to analyze!")

if __name__ == "__main__":
    verify_opencv()
    verify_database_analysis()
