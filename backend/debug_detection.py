import face_recognition
import os
import numpy as np
from PIL import Image

def debug_image_detection(img_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    print(f"Debugging detection for: {img_path}")
    try:
        # Method 1: face_recognition internal loader
        print("Testing face_recognition.load_image_file...")
        img_fr = face_recognition.load_image_file(img_path)
        print(f"  - FR Image Metadata: Shape={img_fr.shape}, Dtype={img_fr.dtype}")
        
        # Method 2: PIL conversion
        img_pil = Image.open(img_path).convert('RGB')
        img_np = np.array(img_pil)
        print(f"  - PIL Image Metadata: Shape={img_np.shape}, Dtype={img_np.dtype}")

        print("Testing HOG on FR image...")
        locs = face_recognition.face_locations(img_fr)
        print(f"HOG detected: {len(locs)} faces")

    except Exception as e:
        print(f"Error during debug: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test with a known good image first
    img = r"c:\Users\parik\Downloads\GALLERY\backend\media\photos\2026\03\17\WhatsApp_Image_2024-06-17_at_20.51.41.jpg"
    print(f"Testing with known good image: {img}")
    debug_image_detection(img)
    
    print("\n" + "="*20 + "\n")
    
    # Then the problematic one
    img_bad = r"c:\Users\parik\Downloads\GALLERY\backend\media\temp_search.jpg"
    print(f"Testing with problematic image: {img_bad}")
    debug_image_detection(img_bad)
