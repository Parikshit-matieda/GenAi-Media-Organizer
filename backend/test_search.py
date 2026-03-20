import os
import django
import sys
import numpy as np

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Media, Tag
from api.ai_processor import get_text_embedding

def test_search_precision():
    print("--- Search Precision Verification ---")
    
    # 1. Test Tag Search (exact vs icontains)
    search_term = "dog"
    print(f"\nTesting Tag Search for: '{search_term}'")
    
    # Simulate SearchView logic
    from django.db.models import Q
    media_qs = Media.objects.filter(
        Q(tags__tag_name__iexact=search_term) |
        Q(tags__tag_name__icontains=search_term)
    ).distinct()
    
    print(f"Found {media_qs.count()} results for '{search_term}'")
    for m in media_qs:
        tags = [t.tag_name for t in m.tags.all()]
        print(f" - Media {str(m.media_id)[:8]}: Tags: {tags}")

    # 2. Test Semantic Search Threshold
    query = "a photo of a beach"
    print(f"\nTesting Semantic Search for: '{query}'")
    
    q_emb = get_text_embedding(query)
    if not q_emb:
        print("CLIP model not available, skipping semantic test.")
        return

    media_list = list(Media.objects.exclude(clip_embedding__isnull=True))
    if not media_list:
        print("No media with CLIP embeddings found in DB.")
        return

    m_vecs = np.array([m.clip_embedding for m in media_list])
    q_vec = np.array(q_emb)
    
    # Normalize
    q_vec = q_vec / (np.linalg.norm(q_vec) + 1e-8)
    m_vecs = m_vecs / (np.linalg.norm(m_vecs, axis=1)[:, np.newaxis] + 1e-8)
    
    similarities = np.dot(m_vecs, q_vec)
    
    threshold = 0.22
    results = []
    for i, m in enumerate(media_list):
        sim = float(similarities[i])
        if sim > threshold:
            results.append((m, sim))
    
    print(f"Found {len(results)} semantic results with threshold > {threshold}")
    for m, s in sorted(results, key=lambda x: x[1], reverse=True)[:5]:
        print(f" - Media {str(m.media_id)[:8]}: Similarity: {s:.4f}")

if __name__ == "__main__":
    test_search_precision()
