import os
import django
import sys
import numpy as np
from datetime import date

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Media, Tag
from api.ai_processor import get_text_embedding

def test_enhanced_search():
    print("--- Enhanced Search Verification (Ranking & Filters) ---")
    
    # 1. Test Filter: Date
    today = date.today().isoformat()
    print(f"\nTesting Date Filter (date_from={today})")
    media_today = Media.objects.filter(upload_time__date__gte=today)
    print(f"Items uploaded today: {media_today.count()}")

    # 2. Test Ranking in SearchView
    query = "dog"
    print(f"\nTesting Ranking for Query: '{query}'")
    from django.db.models import Q, Case, When, Value, IntegerField
    
    media_qs = Media.objects.annotate(
        relevance=Case(
            When(tags__tag_name__iexact=query, then=Value(10)),
            When(detected_faces__person_name__iexact=query, then=Value(8)),
            When(tags__tag_name__icontains=query, then=Value(5)),
            default=Value(0),
            output_field=IntegerField(),
        )
    ).filter(relevance__gt=0).order_by('-relevance', '-upload_time')
    
    print(f"Found {media_qs.count()} ranked results.")
    for m in media_qs[:5]:
        print(f" - Media {str(m.media_id)[:8]}: Relevance: {m.relevance}")

    # 3. Test Filter: Category
    print("\nTesting Category Filter: 'documents'")
    doc_tags = ['receipt', 'invoice', 'document', 'text_detected']
    docs = Media.objects.filter(tags__tag_name__in=doc_tags).distinct()
    print(f"Document category items: {docs.count()}")

if __name__ == "__main__":
    test_enhanced_search()
