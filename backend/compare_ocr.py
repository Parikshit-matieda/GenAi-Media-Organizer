import easyocr
import pytesseract
import cv2
import numpy as np
import os

# Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def compare_ocr(image_path):
    print(f"--- Comparing OCR engines for {image_path} ---")
    if not os.path.exists(image_path):
        print("Image not found, creating a new one...")
        img = np.ones((600, 1000, 3), dtype=np.uint8) * 255
        cv2.putText(img, "TESTING OCR COMPARISON", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 0), 4)
        cv2.putText(img, "Receipt #98765", (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 3)
        cv2.imwrite(image_path, img)

    img = cv2.imread(image_path)
    
    # Tesseract
    print("Running Tesseract...")
    tess_text = pytesseract.image_to_string(img)
    print(f"Tesseract Output: '{tess_text.strip()}'")
    
    # EasyOCR
    print("Running EasyOCR...")
    reader = easyocr.Reader(['en'], gpu=False)
    results = reader.readtext(image_path)
    easy_text = " ".join([res[1] for res in results])
    print(f"EasyOCR Output: '{easy_text.strip()}'")
    print(f"EasyOCR Raw: {results}")

if __name__ == "__main__":
    compare_ocr("comp_test.jpg")
