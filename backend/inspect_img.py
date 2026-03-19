import os
import numpy as np
from PIL import Image

def inspect_image(img_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return

    print(f"Inspecting: {img_path}")
    try:
        # Load with PIL
        with Image.open(img_path) as img:
            print(f"  - PIL Mode: {img.mode}")
            print(f"  - PIL Size: {img.size}")
            
            # Convert to RGB explicitly
            img_rgb = img.convert('RGB')
            print(f"  - Converted Mode: {img_rgb.mode}")
            
            img_np = np.array(img_rgb)
            print(f"  - Numpy Shape: {img_np.shape}")
            print(f"  - Numpy Dtype: {img_np.dtype}")
            print(f"  - Numpy Min: {np.min(img_np)}")
            print(f"  - Numpy Max: {np.max(img_np)}")
            
            # Check if it's contiguous
            print(f"  - Is Contiguous: {img_np.flags['C_CONTIGUOUS']}")

    except Exception as e:
        print(f"Error during inspection: {e}")

if __name__ == "__main__":
    img = r"c:\Users\parik\Downloads\GALLERY\backend\media\temp_search.jpg"
    inspect_image(img)
