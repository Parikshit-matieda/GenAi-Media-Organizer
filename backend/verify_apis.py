import requests
import os
import json

BASE_URL = "http://127.0.0.1:8000/api"

def test_api_health():
    print("\n--- Testing API URLs ---")
    urls = [
        f"{BASE_URL}/rooms/",
        f"{BASE_URL}/search/",
    ]
    for url in urls:
        try:
            response = requests.get(url)
            print(f"GET {url} -> Status: {response.status_code}")
        except Exception as e:
            print(f"FAILED to connect to {url}: {e}")

def verify_endpoints_exist():
    print("\n--- Testing Face Endpoints Existence ---")
    # Face Search (requires POST)
    try:
        response = requests.post(f"{BASE_URL}/face/search/", data={})
        print(f"POST {BASE_URL}/face/search/ -> Status: {response.status_code} (Expected 400 since no data)")
    except Exception as e:
        print(f"Face Search endpoint check failed: {e}")

    # Face Name (requires ID, testing 404 for non-existent face)
    try:
        response = requests.post(f"{BASE_URL}/face/name/9999/", data={"person_name": "Test"})
        print(f"POST {BASE_URL}/face/name/9999/ -> Status: {response.status_code} (Expected 404)")
    except Exception as e:
        print(f"Face Name endpoint check failed: {e}")

if __name__ == "__main__":
    print("Pre-verification starting...")
    print("NOTE: Ensure Django server is running on http://127.0.0.1:8000")
    test_api_health()
    verify_endpoints_exist()
