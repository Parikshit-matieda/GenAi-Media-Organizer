import easyocr
import cv2
import numpy as np
import os

def test_ocr():
    print("Initializing EasyOCR Reader...")
    try:
        reader = easyocr.Reader(['en'], gpu=False) # Use CPU for now
        print("Reader initialized.")
        
        # Create a test image
        img = np.zeros((200, 400, 3), dtype=np.uint8)
        cv2.putText(img, "EASYOCR TEST", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.imwrite("test_easyocr.jpg", img)
        
        print("Processing image...")
        results = reader.readtext("test_easyocr.jpg")
        print(f"Results: {results}")
        
        text = " ".join([res[1] for res in results])
        print(f"Extracted Text: {text}")
        
        if "EASYOCR" in text.upper():
            print("SUCCESS: EasyOCR worked!")
        else:
            print("FAILURE: Text not detected correctly.")
            
    except Exception as e:
        print(f"Error during OCR test: {e}")
    finally:
        if os.path.exists("test_easyocr.jpg"):
            os.remove("test_easyocr.jpg")

if __name__ == "__main__":
    test_ocr()
