import cv2
import easyocr
from ultralytics import YOLO
import os
import numpy as np
from django.conf import settings
from PIL import Image
import importlib.util

# Check if sentence-transformers is installed without importing it yet
CLIP_AVAILABLE = importlib.util.find_spec("sentence_transformers") is not None
if not CLIP_AVAILABLE:
    print("WARNING: sentence-transformers not found. Semantic search will be disabled.")

# Attempt to import face_recognition
try:
    import face_recognition
    FACE_REC_AVAILABLE = True
except ImportError:
    FACE_REC_AVAILABLE = False
    print("WARNING: face_recognition library not found. Face matching will be disabled.")

# EasyOCR Reader (Lazy Load)
_ocr_reader = None
def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        print("Loading EasyOCR Reader (en)...")
        _ocr_reader = easyocr.Reader(['en'], gpu=False) # Default to CPU to avoid CUDA issues
    return _ocr_reader

# Load YOLOv8 model
MODEL_PATH = os.path.join(settings.BASE_DIR, 'yolov8n.pt')
model = YOLO(MODEL_PATH) 

# CLIP Model Initialization
_clip_model = None
def get_clip_model():
    global _clip_model, CLIP_AVAILABLE
    if _clip_model is not None:
        return _clip_model
    
    if CLIP_AVAILABLE:
        try:
            print("Loading CLIP Model (clip-ViT-B-32)...")
            from sentence_transformers import SentenceTransformer
            _clip_model = SentenceTransformer('clip-ViT-B-32')
            print("CLIP Model loaded successfully.")
            return _clip_model
        except Exception as e:
            print(f"Error loading CLIP model: {e}")
            CLIP_AVAILABLE = False
    return None

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

    # 2. OCR Detection (EasyOCR)
    try:
        reader = get_ocr_reader()
        results = reader.readtext(image_path)
        text = " ".join([res[1] for res in results])
        text_lower = text.lower()
        
        if text.strip():
            tags.add("text_detected")

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
        print(f"EasyOCR Error: {e}")
        # Optional: Fallback to Tesseract if needed, but for now we follow user request

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

def generate_clip_embedding(image_path):
    """
    Generates a semantic embedding for an image using CLIP.
    """
    model = get_clip_model()
    if model is None:
        return None
    
    try:
        img = Image.open(image_path)
        embedding = model.encode(img)
        return embedding.tolist()
    except Exception as e:
        print(f"Error generating CLIP embedding: {e}")
        return None

def get_text_embedding(text):
    """
    Generates a semantic embedding for a text query using CLIP.
    """
    model = get_clip_model()
    if model is None:
        return None
    
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        print(f"Error generating text embedding: {e}")
        return None
