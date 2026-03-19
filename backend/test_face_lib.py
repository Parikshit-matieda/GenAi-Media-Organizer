import os
import django
import sys

# Setup Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.ai_processor import extract_face_encodings
import numpy as np

def test_actual_encoding():
    print("Testing extract_face_encodings from ai_processor...")
    # Find a sample image in media
    media_dir = r"c:\Users\parik\Downloads\GALLERY\backend\media\photos"
    found_img = None
    for root, dirs, files in os.walk(media_dir):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                found_img = os.path.join(root, file)
                break
        if found_img: break
    
    if not found_img:
        print("No images found in media/photos to test with.")
        return

    print(f"Testing with: {found_img}")
    try:
        results = extract_face_encodings(found_img)
        print(f"Total results: {len(results)}")
        for i, res in enumerate(results):
            enc = np.array(res['encoding'])
            is_zero = np.all(enc == 0.0)
            print(f"Face {i} encoding sum: {np.sum(np.abs(enc))}")
            print(f"Face {i} is all zeros: {is_zero}")
    except Exception as e:
        print(f"Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_actual_encoding()
