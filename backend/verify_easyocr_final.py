import os
import sys

# Ensure backend/api is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

import cv2
import numpy as np
from api.ai_processor import process_image_ai

def run_verification():
    print("--- EasyOCR Integration Verification ---")
    
    # 1. Create a test image with distinct text
    # Using multiple words to test EasyOCR properly
    image_path = "final_verification.jpg"
    img = np.ones((400, 800, 3), dtype=np.uint8) * 255
    cv2.putText(img, "SMART GALLERY AI", (100, 150), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 4)
    cv2.putText(img, "INVOICE: #TRX-9988", (100, 250), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    cv2.putText(img, "Total Payment: $125.50", (100, 320), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2)
    cv2.imwrite(image_path, img)
    print(f"Created test image: {image_path}")

    # 2. Process with AI processor (which now uses EasyOCR)
    print("\nProcessing image with AI... (First run may take a few seconds to load models)")
    try:
        # Note: process_image_ai now handles the EasyOCR reader lazily
        tags = process_image_ai(image_path)
        
        print("\nVerification Results:")
        print(f"Tags Detected: {tags}")
        
        # Expected tags based on rules in ai_processor.py
        expected_tags = ['text_detected', 'receipt', 'payment', 'invoice', 'document']
        matches = [t for t in tags if t in expected_tags]
        
        print(f"Rule-based matches found: {matches}")
        
        if 'text_detected' in tags:
            print("\nSUCCESS: EasyOCR correctly detected text and mapped it to tags!")
        else:
            print("\nFAILURE: Text was not detected by EasyOCR.")
            
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
    finally:
        if os.path.exists(image_path):
            os.remove(image_path)

if __name__ == "__main__":
    run_verification()
