import easyocr
import cv2
import numpy as np
import os

def test_ocr_robust():
    print("Initializing Reader...")
    reader = easyocr.Reader(['en'], gpu=False)
    
    # Create a high-contrast image
    img = np.ones((400, 800, 3), dtype=np.uint8) * 255
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, "INVOICE #12345", (50, 100), font, 2, (0, 0, 0), 3)
    cv2.putText(img, "Date: 2026-03-20", (50, 200), font, 1, (0, 0, 0), 2)
    cv2.putText(img, "Total Amount: $500.00", (50, 300), font, 1.5, (0, 0, 0), 3)
    
    image_path = "robust_test.jpg"
    cv2.imwrite(image_path, img)
    
    print(f"Reading {image_path}...")
    results = reader.readtext(image_path)
    print(f"Results: {results}")
    
    text = " ".join([res[1] for res in results])
    print(f"Full Text: {text}")
    
    if "INVOICE" in text.upper() and "$" in text:
        print("SUCCESS: Robust OCR test passed!")
    else:
        print("FAILURE: OCR did not detect the expected keywords.")
    
    os.remove(image_path)

if __name__ == "__main__":
    test_ocr_robust()
