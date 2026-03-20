import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Media
from api.ai_processor import generate_clip_embedding

def backfill_embeddings():
    media_without_embeddings = Media.objects.filter(clip_embedding__isnull=True)
    total = media_without_embeddings.count()
    print(f"Found {total} images without CLIP embeddings.")
    
    for i, media in enumerate(media_without_embeddings):
        print(f"[{i+1}/{total}] Processing {media.media_id}...")
        try:
            image_path = media.image.path
            emb = generate_clip_embedding(image_path)
            if emb:
                media.clip_embedding = emb
                media.save()
                print(f"  ✅ Saved embedding.")
            else:
                print(f"  ⚠️ Could not generate embedding.")
        except Exception as e:
            print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    backfill_embeddings()
