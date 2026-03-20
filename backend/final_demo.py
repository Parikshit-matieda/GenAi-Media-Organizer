import easyocr
import cv2
import numpy as np
import os

def final_demo():
    print("--- Final EasyOCR Verification Demo ---")
    
    # 1. Initialize Reader
    print("Initializing Reader (CPU mode)...")
    reader = easyocr.Reader(['en'], gpu=False)
    
    # 2. Create a very clear test image
    image_path = "demo_text.jpg"
    img = np.ones((600, 1000, 3), dtype=np.uint8) * 255
    font = cv2.FONT_HERSHEY_SIMPLEX
    # Big, bold text
    cv2.putText(img, "VERIFY EASYOCR", (50, 150), font, 3, (0, 0, 0), 10)
    cv2.putText(img, "DETECTION SUCCESS", (50, 350), font, 2, (0, 0, 0), 5)
    cv2.putText(img, "Value: $1,234.56", (50, 500), font, 2, (0, 0, 0), 5)
    
    cv2.imwrite(image_path, img)
    print(f"Created demo image: {image_path}")
    
    # 3. Read text
    print("Reading image...")
    results = reader.readtext(image_path)
    
    print("\n--- OCR RESULTS ---")
    full_text = []
    for (bbox, text, prob) in results:
        print(f"Detected: '{text}' (Confidence: {prob:.2f})")
        full_text.append(text)
    
    result_str = " ".join(full_text)
    print(f"\nFull Extracted Text: {result_str}")
    
    # 4. Cleanup
    if os.path.exists(image_path):
        os.remove(image_path)
        
    if "EASYOCR" in result_str.upper() and "$" in result_str:
        print("\nCONCLUSION: EASYOCR IS FULLY FUNCTIONAL!")
    else:
        print("\nCONCLUSION: OCR DETECTION FAILED TO MATCH EXPECTED KEYWORDS.")

if __name__ == "__main__":
    final_demo()
