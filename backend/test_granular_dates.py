import os
import django
import sys
from datetime import date

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_gallery.settings')
django.setup()

from api.models import Media

def test_granular_dates():
    print("--- Granular Date Filter Verification ---")
    
    # Check if we have any media
    total = Media.objects.count()
    if total == 0:
        print("No media in DB to test.")
        return
        
    m = Media.objects.first()
    d = m.upload_time
    
    print(f"\nTest Item Date: {d.isoformat()}")
    
    # 1. Test Year
    year = d.year
    qs_year = Media.objects.filter(upload_time__year=year)
    print(f"Year {year} count: {qs_year.count()} (Expected >= 1)")
    
    # 2. Test Month
    month = d.month
    qs_month = Media.objects.filter(upload_time__month=month)
    print(f"Month {month} count: {qs_month.count()} (Expected >= 1)")
    
    # 3. Test Day
    day = d.day
    qs_day = Media.objects.filter(upload_time__day=day)
    print(f"Day {day} count: {qs_day.count()} (Expected >= 1)")
    
    # 4. Integrated Filter (Year + Month)
    qs_ym = Media.objects.filter(upload_time__year=year, upload_time__month=month)
    print(f"Year {year} + Month {month} count: {qs_ym.count()} (Expected >= 1)")

if __name__ == "__main__":
    test_granular_dates()
