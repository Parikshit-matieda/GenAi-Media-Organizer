import cv2
import pytesseract
from ultralytics import YOLO
import os
import numpy as np

# Mock Django settings for standalone test
class MockSettings:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

settings = MockSettings()

# Standalone logic (mirrored from ai_processor.py but without Django dependencies)
def process_image_ai_standalone(image_path):
    # Configure Tesseract Path
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    
    # Load YOLOv8 model - assumes model is in current dir
    MODEL_PATH = os.path.join(settings.BASE_DIR, 'yolov8n.pt')
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"YOLO model not found at {MODEL_PATH}")
        
    model = YOLO(MODEL_PATH)
    
    tags = set()
    results = model(image_path)
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            label = model.names[class_id]
            tags.add(label.lower())
    
    try:
        img = cv2.imread(image_path)
        text = pytesseract.image_to_string(img)
        if text.strip():
            tags.add("text_detected")
    except Exception as e:
        print(f"OCR Error: {e}")
        
    return list(tags)

def test_ai_stack():
    print("--- Starting AI Stack Verification ---")
    
    # Check Tesseract
    tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(tesseract_path):
        print(f"SUCCESS: Tesseract found at {tesseract_path}")
    else:
        print(f"FAILURE: Tesseract NOT found at {tesseract_path}")
        return

    # Create a dummy image for testing
    dummy_path = "test_image.jpg"
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    cv2.putText(img, "TEST OCR", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)
    cv2.imwrite(dummy_path, img)
    print(f"Created dummy test image: {dummy_path}")

    try:
        # Test YOLO and OCR
        print("Running AI processing...")
        tags = process_image_ai_standalone(dummy_path)
        print(f"Detected Tags: {tags}")
        
        if 'text_detected' in tags or any(tag in ['text', 'sign', 'label'] for tag in tags):
            print("SUCCESS: AI logic processed image correctly.")
        else:
            print("NOTE: AI logic ran but no specific tags were mapped for the dummy image.")
            
    except Exception as e:
        print(f"CRITICAL ERROR during AI processing: {e}")
    finally:
        if os.path.exists(dummy_path):
            os.remove(dummy_path)
            print("Cleaned up test image.")

if __name__ == "__main__":
    test_ai_stack()
