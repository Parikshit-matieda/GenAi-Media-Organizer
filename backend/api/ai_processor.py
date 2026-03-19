import cv2
import pytesseract
from ultralytics import YOLO
import os
import numpy as np
from django.conf import settings

# Attempt to import face_recognition
try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    print("WARNING: face_recognition library not found. Face matching will be disabled.")

# Configure Tesseract Path for Windows
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Load YOLOv8 model
MODEL_PATH = os.path.join(settings.BASE_DIR, 'yolov8n.pt')
model = YOLO(MODEL_PATH) 

def process_image_ai(image_path):
    """
    Processes an image for:
    1. Object detection (YOLO)
    2. OCR (Tesseract)
    3. Rule-based Tag Generation
    """
    tags = set()
    
    # 1. Object Detection
    results = model(image_path)
    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])
            label = model.names[class_id]
            tags.add(label.lower())

    # 2. OCR Detection
    try:
        img = cv2.imread(image_path)
        text = pytesseract.image_to_string(img)
        text_lower = text.lower()
        
        # Rule-based OCR tags
        currency_symbols = ['$', '₹', '€', '£']
        if any(sym in text for sym in currency_symbols):
            tags.add('receipt')
            tags.add('payment')
            
        common_keywords = {
            'amazon': 'shopping',
            'invoice': 'document',
            'ticket': 'travel',
            'order': 'order',
            'menu': 'food'
        }
        
        for key, val in common_keywords.items():
            if key in text_lower:
                tags.add(key)
                tags.add(val)
    except Exception as e:
        print(f"OCR Error: {e}")

    # 3. Smart Folder Rules
    if 'dog' in tags or 'cat' in tags:
        tags.add('pets')
    
    if 'beach' in tags or 'mountain' in tags:
        tags.add('travel')

    return list(tags)

def extract_face_encodings(image_path):
    """
    Detects faces and generates 128-d embeddings.
    [VERSION: 2026-03-18 03:55]
    """
    print(f"--- AI Processor v3: Processing {os.path.basename(image_path)} ---")
    print(f"Extraction Triggered. Library available: {FACE_REC_AVAILABLE}")
    
    if FACE_REC_AVAILABLE:
        try:
            # Load with OpenCV for maximum compatibility across formats
            img_bgr = cv2.imread(image_path)
            if img_bgr is None:
                print(f"  ❌ OpenCV failed to read: {image_path}")
                return []
            
            image = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(image)
            
            # If no faces found, try upsampling
            if not face_locations:
                print("  - No faces found with HOG, trying with upsampling...")
                face_locations = face_recognition.face_locations(image, number_of_times_to_upsample=2)
            
            print(f"  - face_recognition detected {len(face_locations)} faces.")
            
            if not face_locations:
                print("  - Face Recognition found 0 faces. No entry will be created.")
                return []
            
            face_encodings = face_recognition.face_encodings(image, face_locations)
            results = []
            for location, encoding in zip(face_locations, face_encodings):
                results.append({
                    'encoding': encoding.tolist(),
                    'location': location
                })
            print(f"  - Successfully extracted {len(results)} valid embeddings.")
            return results
        except Exception as e:
            print(f"  ❌ Critical Face Recognition Error: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    # Only if library missing
    print("  ⚠️ FALLBACK: Library missing, using OpenCV detection only (Zeros).")
    try:
        results = []
        face_locations = detect_faces(image_path) 
        print(f"  - OpenCV detected {len(face_locations)} faces.")
        for loc in face_locations:
            results.append({
                'encoding': [0.0] * 128,
                'location': loc
            })
        return results
    except Exception as e:
        print(f"  ❌ Fallback Face Detection Error: {e}")
        return []

def compare_embeddings(query_encoding, stored_encodings, threshold=0.5):
    """
    Compares a query encoding with a list of stored encodings using Euclidean distance.
    Returns indices of matches.
    """
    if not stored_encodings:
        return []

    # Filter out empty/placeholder embeddings (zero vectors)
    valid_indices = [i for i, enc in enumerate(stored_encodings) if any(val != 0.0 for val in enc)]
    if not valid_indices:
        return []

    query_np = np.array(query_encoding)
    stored_np = np.array([stored_encodings[i] for i in valid_indices])
    
    # Calculate Euclidean distances
    distances = np.linalg.norm(stored_np - query_np, axis=1)
    
    # Return original indices where distance < threshold
    matches = [valid_indices[i] for i in np.where(distances < threshold)[0]]
    return matches

def detect_faces(image_path):
    """
    OpenCV-based face detection (Haar Cascades).
    Returns list of (top, right, bottom, left)
    """
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    img = cv2.imread(image_path)
    if img is None: return []
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    locations = []
    for (x, y, w, h) in faces:
        # Convert to (top, right, bottom, left) format and ensure standard Python ints
        locations.append((int(y), int(x + w), int(y + h), int(x)))
    return locations
