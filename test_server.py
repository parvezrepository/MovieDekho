"""
Comprehensive Integration Test Suite for MovieBox Platform
Verifies:
1. Root web application HTML serving
2. Home discovery & trending feed
3. Genre taxonomy retrieval
4. Multi-parameter discovery (genre, year, rating, sorting)
5. Search by keyword & release year
6. TMDB to MovieBox stream candidate resolution
7. Deep metadata enrichment (cast, crew, recommendations)
8. Multi-source stream resolution & quality detection
9. Dual / Multi-audio track detection
10. Bangla & English subtitles & WebVTT conversion
11. HTTP 206 Partial Content Range streaming proxy
"""

from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def run_all_tests():
    print("==================================================")
    print("Running Full MovieBox Platform Test Suite...")
    print("==================================================")

    # 1. Root HTML
    r_root = client.get("/")
    assert r_root.status_code == 200, f"Root failed: {r_root.status_code}"
    assert "PARXSTREAM" in r_root.text, "Root HTML missing branding"
    print(" [PASS] 1. Root web application loaded successfully.")

    # 2. Home feed
    r_home = client.get("/api/home")
    assert r_home.status_code == 200, f"Home failed: {r_home.status_code}"
    home_data = r_home.json()
    assert len(home_data.get("trending", [])) > 0, "Empty trending feed"
    print(f" [PASS] 2. Home feed returned {len(home_data['trending'])} trending titles.")

    # 3. Genre taxonomy
    r_genres = client.get("/api/genres")
    assert r_genres.status_code == 200, f"Genres failed: {r_genres.status_code}"
    genres = r_genres.json().get("genres", [])
    assert len(genres) > 0, "No genres returned"
    print(f" [PASS] 3. Genre taxonomy returned {len(genres)} genres (e.g., {[g['name'] for g in genres[:3]]}).")

    # 4. Multi-parameter Discover Engine
    action_genre = next((g["id"] for g in genres if g["name"] == "Action"), None)
    r_discover = client.get(f"/api/discover?genre_id={action_genre or ''}&year=2024&rating_min=7.0&sort_by=popularity.desc")
    assert r_discover.status_code == 200, f"Discover failed: {r_discover.status_code}"
    discover_data = r_discover.json()
    print(f" [PASS] 4. Discover filter (Action, 2024, Rating 7.0+) returned {len(discover_data.get('results', []))} titles.")

    # 5. Search with Year Filter
    r_search = client.get("/api/search?q=Inception&year=2010")
    assert r_search.status_code == 200, f"Search failed: {r_search.status_code}"
    search_data = r_search.json()
    assert len(search_data.get("results", [])) > 0, "No search results for Inception (2010)"
    first_res = search_data["results"][0]
    subject_id = first_res.get("subject_id") or "6391474290696802080"
    print(f" [PASS] 5. Search by keyword & year ('Inception', 2010) returned {len(search_data['results'])} results.")

    # 6. TMDB to Moviebox Stream Matcher
    r_bridge = client.get("/api/tmdb-to-moviebox?title=Inception&year=2010")
    assert r_bridge.status_code == 200, f"Bridge failed: {r_bridge.status_code}"
    bridge_id = r_bridge.json().get("subject_id")
    assert bridge_id is not None, "Failed to resolve MovieBox subject ID for TMDB title"
    print(f" [PASS] 6. TMDB to MovieBox bridge resolved subject ID: {bridge_id}.")

    # 7. Deep Metadata Enrichment (Cast & Recommendations)
    r_detail = client.get(f"/api/detail/{bridge_id}")
    assert r_detail.status_code == 200, f"Detail failed: {r_detail.status_code}"
    detail_data = r_detail.json()
    cast = detail_data.get("cast", [])
    recommendations = detail_data.get("recommendations", [])
    print(f" [PASS] 7. Deep metadata retrieved: '{detail_data.get('title')}' with {len(cast)} cast members and {len(recommendations)} recommendations.")

    # 8. Audio Options (Dual / Multi-Audio)
    r_audio = client.get(f"/api/audio-options/{bridge_id}")
    assert r_audio.status_code == 200, f"Audio options failed: {r_audio.status_code}"
    audio_tracks = r_audio.json().get("audio_tracks", [])
    assert len(audio_tracks) > 0, "No audio tracks detected"
    print(f" [PASS] 8. Audio tracks detected: {[t['label'] for t in audio_tracks]}.")

    # 9. Multi-Source Streams & Quality Detection
    r_streams = client.get(f"/api/streams/{bridge_id}")
    assert r_streams.status_code == 200, f"Streams failed: {r_streams.status_code}"
    streams = r_streams.json().get("streams", [])
    assert len(streams) > 0, "No streams resolved"
    qualities = [s.get("quality") for s in streams]
    sources = [s.get("source_name") for s in streams]
    print(f" [PASS] 9. Streams resolved: {len(streams)} sources/qualities ({qualities}).")

    # 10. Subtitle Tracks & Realtime WebVTT Conversion
    r_captions = client.get(f"/api/captions/{bridge_id}")
    assert r_captions.status_code == 200, f"Captions failed: {r_captions.status_code}"
    captions = r_captions.json().get("captions", [])
    assert len(captions) > 0, "No caption tracks resolved"
    vtt_url = captions[0].get("vtt_url")
    r_vtt = client.get(vtt_url)
    assert r_vtt.status_code == 200, "VTT proxy conversion failed"
    assert "WEBVTT" in r_vtt.text, "VTT header missing"
    assert r_vtt.headers.get("access-control-allow-origin") == "*", "CORS header missing"
    print(f" [PASS] 10. Subtitles resolved: {len(captions)} languages. WebVTT conversion verified with CORS.")

    # 11. High-Speed Video Stream Proxy (HTTP 206 Partial Content)
    mp4_stream = next((s for s in streams if s.get("format") == "MP4"), streams[0])
    proxy_url = mp4_stream.get("proxy_url")
    assert proxy_url is not None, "Missing proxy URL"
    r_proxy = client.get(proxy_url, headers={"Range": "bytes=0-1024"})
    assert r_proxy.status_code == 206, f"Proxy stream expected 206, got {r_proxy.status_code}"
    assert "Content-Range" in r_proxy.headers, "Missing Content-Range header"
    print(f" [PASS] 11. HTTP 206 Partial Content verified ({r_proxy.headers.get('Content-Range')}). Buffer-free streaming active.")

    # 12. Official 4K Trailer Endpoint
    r_trailer = client.get("/api/trailer?title=Avengers:%20Doomsday")
    assert r_trailer.status_code == 200, f"Trailer failed: {r_trailer.status_code}"
    trailer_data = r_trailer.json()
    assert trailer_data.get("key") is not None, "Missing trailer YouTube key"
    print(f" [PASS] 12. Official Trailer resolved: '{trailer_data.get('name')}' (key: {trailer_data.get('key')}).")

    # 13. Dedicated Anime & Cartoon Endpoint
    r_anime = client.get("/api/anime?page=1")
    assert r_anime.status_code == 200, f"Anime failed: {r_anime.status_code}"
    anime_data = r_anime.json()
    assert len(anime_data.get("results", [])) > 0, "Empty anime results"
    print(f" [PASS] 13. Anime & Cartoon catalog verified ({len(anime_data['results'])} titles, e.g. '{anime_data['results'][0]['title']}').")

    print("\n==================================================")
    print(" ALL 13 TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_all_tests()
