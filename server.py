"""
MovieBox Web-Based Movie & Series Streaming Platform
Advanced FastAPI backend providing:
- High-Performance HTTP 206 Partial Content Video Proxy (Zero-buffer, instant seeking).
- Real-time Subtitle Proxy & WebVTT Converter for Bangla (বাংলা), English, and multi-language captions.
- Source & Stream Manager (Multi-mirror, 1080p, 720p, 480p, 360p, MP4 & DASH).
- Audio Track Detection & Seamless Dynamic Switching (Original, English, Hindi dubs).
- Comprehensive Discovery Engine: Genre filtering, year filters, minimum ratings, recommendations, and cast.
"""

import logging
import os
import re
import urllib.parse
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from engine import MovieBoxEngine
from tmdb_client import tmdb

# Configure logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("StreamingServer")

app = FastAPI(
    title="PARXSTREAM Cinema Engine",
    description="Professional Movie Discovery & Buffer-free Streaming Server",
    version="3.5.0",
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = MovieBoxEngine.get_instance()

# Static directories
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "css"), exist_ok=True)
os.makedirs(os.path.join(STATIC_DIR, "js"), exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# In-memory mapping cache from TMDB ID/Title to MovieBox Subject ID
TMDB_SUBJECT_CACHE: Dict[str, str] = {}


# ---------------------------------------------------------------------------
# ROOT & DASHBOARD
# ---------------------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    """Serves the main modern movie streaming web application."""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(
                content=f.read(),
                headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"}
            )
    return HTMLResponse("<h2>MovieBox Streaming Platform Starting Up...</h2>")


# ---------------------------------------------------------------------------
# GENRES & DISCOVERY ENGINE (WITH FILTERS)
# ---------------------------------------------------------------------------
@app.get("/api/genres")
async def get_genres():
    """Returns official movie and TV genre taxonomies."""
    return {"genres": tmdb.get_genres()}


@app.get("/api/discover")
async def discover_catalog(
    media_type: str = "movie",
    genre_id: Optional[int] = None,
    year: Optional[int] = None,
    rating_min: Optional[float] = None,
    sort_by: str = "popularity.desc",
    page: int = 1,
):
    """
    Powerful movie discovery engine allowing filtering by genre, release year,
    minimum user rating, and sorting criteria.
    """
    return tmdb.discover(
        media_type=media_type,
        genre_id=genre_id,
        year=year,
        rating_min=rating_min,
        sort_by=sort_by,
        page=page,
    )


# ---------------------------------------------------------------------------
# CATALOG & SEARCH ENDPOINTS
# ---------------------------------------------------------------------------
@app.get("/api/home")
async def get_home_feed():
    """Returns curated home feed combining TMDB trending, discover, and Moviebox catalog."""
    try:
        trending = tmdb.get_trending_all("week")
    except Exception as e:
        logger.error(f"Failed to fetch TMDB trending: {e}")
        trending = []

    featured = trending[0] if trending else None
    popular_movies = [t for t in trending if t.get("media_type") == "movie"]
    popular_series = [t for t in trending if t.get("media_type") == "tv"]

    # Enrich movies if list is small
    if len(popular_movies) < 10:
        try:
            more_movies = tmdb.discover(media_type="movie", sort_by="popularity.desc", page=1)
            for m in more_movies.get("results", []):
                if not any(pm.get("tmdb_id") == m.get("tmdb_id") for pm in popular_movies):
                    popular_movies.append(m)
        except Exception as e:
            logger.warning(f"Failed to enrich movies: {e}")

    # Enrich series if list is small
    if len(popular_series) < 10:
        try:
            more_series = tmdb.discover(media_type="tv", sort_by="popularity.desc", page=1)
            for s in more_series.get("results", []):
                if not any(ps.get("tmdb_id") == s.get("tmdb_id") for ps in popular_series):
                    popular_series.append(s)
        except Exception as e:
            logger.warning(f"Failed to enrich series: {e}")

    # Fallback to Moviebox search if TMDB is empty
    if not popular_movies:
        try:
            raw_mb = engine.search("Avengers", page=1, per_page=12)
            popular_movies = raw_mb
        except Exception:
            pass

    return {
        "featured": featured,
        "trending": trending[:15],
        "movies": popular_movies[:12],
        "series": popular_series[:12],
    }


@app.get("/api/search")
async def search_catalog(
    q: str = Query(..., min_length=1, description="Search keyword"),
    year: Optional[int] = None,
    page: int = 1,
    per_page: int = 20,
):
    """
    Searches catalog for movies and TV series matching keywords, with optional release year filter.
    Combines native Moviebox index with TMDB enrichment.
    """
    clean_q = q.strip()
    safe_per_page = min(max(1, per_page), 20)
    try:
        # First query native Moviebox index
        results = engine.search(clean_q, page=page, per_page=safe_per_page)

        # Apply year filter if requested
        if year:
            results = [r for r in results if (r.get("release_date") or "").startswith(str(year))]

        # If native index has few results or empty, fallback/augment with TMDB
        if len(results) < 4:
            tmdb_matches = tmdb.search_movies(clean_q, year=year, page=page)
            # Add unique TMDB items
            existing_titles = {r.get("title", "").lower() for r in results}
            for tm in tmdb_matches:
                if tm.get("title", "").lower() not in existing_titles:
                    results.append({
                        "tmdb_id": tm.get("tmdb_id"),
                        "title": tm.get("title"),
                        "type": tm.get("type"),
                        "release_date": tm.get("year", ""),
                        "imdb_rating": str(tm.get("rating", "")),
                        "cover": tm.get("poster"),
                        "backdrop": tm.get("backdrop"),
                        "overview": tm.get("overview"),
                    })

        return {
            "query": clean_q,
            "year": year,
            "page": page,
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        logger.error(f"Search error for query '{clean_q}': {e}")
        tmdb_results = tmdb.search_movies(clean_q, year=year, page=page)
        return {
            "query": clean_q,
            "year": year,
            "page": page,
            "count": len(tmdb_results),
            "results": tmdb_results,
            "fallback": True,
        }


@app.get("/api/suggest")
async def search_suggestions(q: str = Query(..., min_length=1)):
    """Provides realtime instant suggestions for search bar with posters and ratings."""
    clean_q = q.strip()
    try:
        results = engine.search(clean_q, page=1, per_page=8)
        suggestions = []
        for r in results:
            suggestions.append({
                "subject_id": r.get("subject_id"),
                "title": r.get("title"),
                "type": r.get("type"),
                "year": (r.get("release_date") or "")[:4],
                "rating": r.get("imdb_rating"),
                "cover": r.get("cover"),
            })
        return {"suggestions": suggestions}
    except Exception as e:
        logger.error(f"Suggest error for query '{clean_q}': {e}")
        return {"suggestions": []}


# ---------------------------------------------------------------------------
# TMDB TO MOVIEBOX MATCHER & DETAILS ENRICHMENT
# ---------------------------------------------------------------------------
@app.get("/api/tmdb-to-moviebox")
async def resolve_tmdb_to_moviebox(
    title: str = Query(..., min_length=1),
    year: Optional[str] = None,
    tmdb_id: Optional[int] = None,
):
    """
    Bridges TMDB titles to MovieBox streamable subject_ids with in-memory caching.
    """
    cache_key = f"{title}_{year or ''}"
    if cache_key in TMDB_SUBJECT_CACHE:
        return {"subject_id": TMDB_SUBJECT_CACHE[cache_key], "cached": True}

    # Search Moviebox with clean title
    clean_title = re.sub(r"\[.*?\]|\(.*?\)", "", title).strip()
    candidates = engine.search(clean_title, page=1, per_page=10)

    if not candidates:
        return {"subject_id": None, "error": "Not found in streaming catalog"}

    # Best match heuristics
    best_id = candidates[0].get("subject_id")
    if year:
        for c in candidates:
            if (c.get("release_date") or "").startswith(year):
                best_id = c.get("subject_id")
                break

    if best_id:
        TMDB_SUBJECT_CACHE[cache_key] = best_id
        return {"subject_id": best_id, "cached": False}

    return {"subject_id": None, "error": "No stream candidate"}


@app.get("/api/detail/{subject_id}")
async def get_subject_detail(subject_id: str, tmdb_id: Optional[int] = None):
    """
    Retrieves deep metadata:
    - Synopsis, duration, genres, country
    - Cast and crew (via TMDB credits)
    - Recommended and related movies
    - Available audio dubs
    - TV series seasons & episode breakdowns
    """
    try:
        details = engine.get_details(subject_id)

        # Attach seasons if TV Series
        if details.get("subject_type") == 2 or details.get("type") == "Series":
            details["seasons"] = engine.get_episodes(subject_id)
        else:
            details["seasons"] = []

        # Enrich with TMDB metadata, cast, and recommendations
        title = details.get("title", "")
        clean_title = re.sub(r"\[.*?\]|\(.*?\)", "", title).strip()

        target_tmdb_id = tmdb_id
        media_type = "tv" if details.get("type") == "Series" else "movie"

        if not target_tmdb_id:
            # Look up TMDB ID by search
            t_search = tmdb.search_movies(clean_title, page=1)
            if t_search:
                target_tmdb_id = t_search[0].get("tmdb_id")
                media_type = t_search[0].get("media_type", "movie")

        import datetime
        today_str = datetime.date.today().isoformat()
        rel_date = details.get("release_date") or ""

        if target_tmdb_id:
            details["tmdb_id"] = target_tmdb_id
            details["cast"] = tmdb.get_credits(target_tmdb_id, media_type=media_type)
            details["recommendations"] = tmdb.get_recommendations(target_tmdb_id, media_type=media_type)
            # Add extra TMDB details like tagline if available
            tmdb_extra = tmdb.get_details(target_tmdb_id, media_type=media_type)
            if tmdb_extra:
                details["tagline"] = tmdb_extra.get("tagline", "")
                if tmdb_extra.get("backdrop") and not details.get("backdrop"):
                    details["backdrop"] = tmdb_extra.get("backdrop")
                if not rel_date:
                    rel_date = tmdb_extra.get("release_date", "")
                details["is_upcoming"] = tmdb_extra.get("is_upcoming", False)
                details["trailer"] = tmdb_extra.get("trailer")
            else:
                details["trailer"] = tmdb.get_trailer(target_tmdb_id, media_type=media_type)
                details["is_upcoming"] = bool(rel_date and rel_date > today_str)
        else:
            details["cast"] = []
            details["recommendations"] = []
            details["trailer"] = None
            details["is_upcoming"] = bool(rel_date and rel_date > today_str)

        if rel_date and rel_date > today_str:
            details["is_upcoming"] = True

        return details
    except Exception as e:
        logger.error(f"Error fetching details for {subject_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/episodes/{subject_id}")
async def get_series_episodes(subject_id: str):
    """Returns season list and episode count for TV series."""
    try:
        seasons = engine.get_episodes(subject_id)
        return {"subject_id": subject_id, "seasons": seasons}
    except Exception as e:
        logger.error(f"Error fetching episodes for {subject_id}: {e}")
        return {"subject_id": subject_id, "seasons": []}


# ---------------------------------------------------------------------------
# TRAILER ENDPOINT
# ---------------------------------------------------------------------------
@app.get("/api/trailer")
async def get_official_trailer(
    title: Optional[str] = Query(None),
    tmdb_id: Optional[int] = Query(None),
    media_type: str = "movie",
):
    """Retrieves high-definition official YouTube trailer for a title or TMDB ID."""
    target_id = tmdb_id
    if not target_id and title:
        clean_title = re.sub(r"\[.*?\]|\(.*?\)", "", title).strip()
        matches = tmdb.search_movies(clean_title, page=1)
        if matches:
            target_id = matches[0].get("tmdb_id")
            media_type = matches[0].get("media_type", media_type)

    if not target_id:
        raise HTTPException(status_code=404, detail="Title not found for trailer lookup")

    trailer = tmdb.get_trailer(target_id, media_type=media_type)
    if not trailer:
        raise HTTPException(status_code=404, detail="No official trailer available")

    return trailer


# ---------------------------------------------------------------------------
# AUDIO OPTIONS (DUAL / MULTI-AUDIO ENGINE)
# ---------------------------------------------------------------------------
@app.get("/api/audio-options/{subject_id}")
async def get_audio_options(subject_id: str, se: int = 0, ep: int = 0):
    """
    Detects and returns all available real audio tracks:
    - Original Audio
    - English Audio
    - Hindi Audio / Dub
    - Other dubs (Tamil, Telugu, Spanish, etc.)
    Each option references its corresponding subject_id so the player
    can switch streams seamlessly in real-time while preserving playback time.
    """
    try:
        details = engine.get_details(subject_id)
        raw_dubs = details.get("dubs", [])
        title = details.get("title", "")

        options = []
        has_hindi = False
        has_english = False

        # 1. Original Audio
        options.append({
            "id": subject_id,
            "label": "Original Audio",
            "lang_code": "orig",
            "is_default": True,
            "subject_id": subject_id,
        })

        # 2. Add available dubs from Moviebox metadata
        for dub in raw_dubs:
            dub_sid = str(dub.get("subject_id"))
            if dub_sid == subject_id:
                continue

            dub_name = dub.get("lang_name", "")
            lower_name = dub_name.lower()

            if "hindi" in lower_name:
                label = "Hindi Audio"
                lang_code = "hi"
                has_hindi = True
            elif "english" in lower_name:
                label = "English Audio"
                lang_code = "en"
                has_english = True
            elif "original" in lower_name:
                continue
            else:
                label = dub_name
                lang_code = "other"

            options.append({
                "id": dub_sid,
                "label": label,
                "lang_code": lang_code,
                "is_default": False,
                "subject_id": dub_sid,
            })

        # 3. Search for Hindi dub version if not already in dubs list
        if not has_hindi and title:
            clean_title = re.sub(r"\[.*?\]|\(.*?\)", "", title).strip()
            hindi_query = f"{clean_title} Hindi"
            try:
                search_res = engine.search(hindi_query, page=1, per_page=5)
                for item in search_res:
                    i_title = item.get("title", "")
                    if "hindi" in i_title.lower() and str(item.get("subject_id")) != subject_id:
                        options.append({
                            "id": str(item.get("subject_id")),
                            "label": "Hindi Audio",
                            "lang_code": "hi",
                            "is_default": False,
                            "subject_id": str(item.get("subject_id")),
                        })
                        has_hindi = True
                        break
            except Exception:
                pass

        return {
            "subject_id": subject_id,
            "season": se,
            "episode": ep,
            "audio_tracks": options,
        }
    except Exception as e:
        logger.error(f"Error fetching audio options for {subject_id}: {e}")
        return {
            "subject_id": subject_id,
            "season": se,
            "episode": ep,
            "audio_tracks": [
                {
                    "id": subject_id,
                    "label": "Original Audio",
                    "lang_code": "orig",
                    "is_default": True,
                    "subject_id": subject_id,
                }
            ],
        }


# ---------------------------------------------------------------------------
# STREAMS & MULTI-SOURCE RESOLVER
# ---------------------------------------------------------------------------
@app.get("/api/streams/{subject_id}")
async def get_streams(
    subject_id: str,
    se: int = 0,
    ep: int = 0,
    detail_path: Optional[str] = None,
):
    """
    Resolves available sources (Web CDN, Native Mobile CDN, mirrors)
    and formats (MP4, DASH) with real supported resolutions (1080p, 720p, 480p, 360p, 4K).
    Generates high-speed proxy stream URLs with HTTP 206 Range support.
    """
    try:
        raw_streams = engine.get_streams(subject_id, season=se, episode=ep, detail_path=detail_path)
        formatted_streams = []

        # Sort: MP4 preferred for universal browser support, then quality descending
        sorted_streams = sorted(
            raw_streams,
            key=lambda s: (1 if s.get("format") == "MP4" else 0, s.get("quality_value", 0)),
            reverse=True,
        )

        for idx, s in enumerate(sorted_streams):
            raw_url = s.get("url")
            if not raw_url:
                continue

            encoded_url = urllib.parse.quote(raw_url, safe="")
            cookie_param = ""
            if s.get("cookie"):
                encoded_cookie = urllib.parse.quote(s["cookie"], safe="")
                cookie_param = f"&cookie={encoded_cookie}"

            proxy_url = f"/api/proxy/stream?url={encoded_url}{cookie_param}"

            # Format source name
            source_raw = s.get("source", "Web CDN")
            source_label = f"Source {idx + 1} ({source_raw.split('(')[0].strip()})"

            formatted_streams.append({
                "id": f"src_{idx + 1}",
                "source_name": source_label,
                "source": s.get("source"),
                "quality": s.get("quality", "HD"),
                "quality_value": s.get("quality_value", 0),
                "format": s.get("format", "MP4"),
                "size_mb": s.get("size_mb", 0),
                "url": raw_url,
                "proxy_url": proxy_url,
                "duration_sec": s.get("duration_sec"),
            })

        return {
            "subject_id": subject_id,
            "season": se,
            "episode": ep,
            "count": len(formatted_streams),
            "streams": formatted_streams,
        }
    except Exception as e:
        logger.error(f"Error resolving streams for {subject_id}: {e}")
        return {"subject_id": subject_id, "season": se, "episode": ep, "count": 0, "streams": []}


# ---------------------------------------------------------------------------
# SUBTITLES / CAPTIONS RESOLVER
# ---------------------------------------------------------------------------
@app.get("/api/captions/{subject_id}")
async def get_captions(
    subject_id: str,
    se: int = 0,
    ep: int = 0,
    stream_id: Optional[str] = None,
):
    """
    Returns all real subtitle tracks with Bangla (বাংলা) and English prioritized.
    Provides WebVTT proxy URLs for seamless native video player integration.
    """
    try:
        raw_subs = engine.get_subtitles(subject_id, stream_id=stream_id, season=se, episode=ep)
        formatted_subs = []

        for s in raw_subs:
            u = s.get("url")
            if not u:
                continue
            encoded_url = urllib.parse.quote(u, safe="")
            vtt_proxy_url = f"/api/proxy/subtitle?url={encoded_url}&lang={s.get('code', 'en')}"

            formatted_subs.append({
                "id": s.get("id"),
                "language": s.get("language"),
                "code": s.get("code"),
                "url": u,
                "vtt_url": vtt_proxy_url,
                "is_bangla": (
                    s.get("code") == "bn"
                    or "bangla" in s.get("language", "").lower()
                    or "বাংলা" in s.get("language", "")
                ),
                "is_english": (
                    s.get("code") == "en"
                    or "english" in s.get("language", "").lower()
                ),
            })

        return {
            "subject_id": subject_id,
            "season": se,
            "episode": ep,
            "count": len(formatted_subs),
            "captions": formatted_subs,
        }
    except Exception as e:
        logger.error(f"Error fetching captions for {subject_id}: {e}")
        return {"subject_id": subject_id, "season": se, "episode": ep, "count": 0, "captions": []}


# ---------------------------------------------------------------------------
# HIGH-SPEED BUFFER-FREE VIDEO STREAM PROXY (HTTP 206 PARTIAL CONTENT)
# ---------------------------------------------------------------------------
@app.get("/api/proxy/stream")
async def stream_proxy(url: str, request: Request, cookie: Optional[str] = None):
    """
    Ultra-fast asynchronous video streaming proxy supporting HTTP 206 Range requests.
    Prevents CDN 429 rate-limiting, CORS errors, and enables smooth instant seeking.
    """
    decoded_url = urllib.parse.unquote(url)
    parsed = urllib.parse.urlsplit(decoded_url)
    netloc = parsed.netloc.lower()

    if "aoneroom.com" in netloc:
        req_headers = {
            "User-Agent": "com.community.mbox.in/50020130 (Linux; U; Android 14; en_IN; Pixel 8; Build/UD1A.230803.041; Cronet/145.0.7582.0)",
            "Referer": "https://api3.aoneroom.com/",
            "Accept": "*/*",
            "Connection": "keep-alive",
        }
    else:
        req_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": "https://123moviesfree.club/",
            "Origin": "https://123moviesfree.club",
            "Accept": "*/*",
            "Connection": "keep-alive",
        }

    if cookie:
        req_headers["Cookie"] = urllib.parse.unquote(cookie)

    # Forward Range header from browser
    client_range = request.headers.get("Range")
    if client_range:
        req_headers["Range"] = client_range

    client = httpx.AsyncClient(timeout=httpx.Timeout(connect=15.0, read=60.0, write=15.0, pool=30.0))

    try:
        upstream_req = client.build_request("GET", decoded_url, headers=req_headers)
        upstream_resp = await client.send(upstream_req, stream=True)

        status_code = upstream_resp.status_code

        res_headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Range, Accept-Ranges, Content-Type",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
            "Accept-Ranges": "bytes",
            "Content-Type": upstream_resp.headers.get("Content-Type", "video/mp4"),
        }

        if "Content-Range" in upstream_resp.headers:
            res_headers["Content-Range"] = upstream_resp.headers["Content-Range"]
        if "Content-Length" in upstream_resp.headers:
            res_headers["Content-Length"] = upstream_resp.headers["Content-Length"]

        async def stream_generator():
            try:
                async for chunk in upstream_resp.aiter_bytes(chunk_size=128 * 1024):
                    yield chunk
            except Exception as ex:
                logger.debug(f"Streaming connection closed: {ex}")
            finally:
                await upstream_resp.aclose()
                await client.aclose()

        return StreamingResponse(
            stream_generator(),
            status_code=status_code,
            headers=res_headers,
        )

    except Exception as e:
        logger.error(f"Proxy stream error on {decoded_url[:60]}: {e}")
        await client.aclose()
        raise HTTPException(status_code=502, detail=f"Proxy stream failed: {e}")


# ---------------------------------------------------------------------------
# SUBTITLE PROXY & REALTIME WEBVTT CONVERTER
# ---------------------------------------------------------------------------
@app.get("/api/proxy/subtitle")
async def subtitle_proxy(url: str, lang: str = "en"):
    """
    Fetches SRT subtitle files, converts them into standard W3C WebVTT format,
    sanitizes UTF-8 encoding, and serves with proper CORS headers for native video player.
    """
    decoded_url = urllib.parse.unquote(url)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://moviebox.ph/",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(decoded_url, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Subtitle not found upstream")

            raw_bytes = resp.content

            # Decode safely handling UTF-8 with BOM, Latin1, or Arabic encodings
            text = None
            for encoding in ("utf-8-sig", "utf-8", "windows-1256", "cp1252", "iso-8859-1"):
                try:
                    text = raw_bytes.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue

            if text is None:
                text = raw_bytes.decode("utf-8", errors="replace")

            # Convert SRT timestamp format (00:00:00,000) to WebVTT format (00:00:00.000)
            clean_text = text.replace("\r\n", "\n").replace("\r", "\n")

            converted_lines = []
            for line in clean_text.split("\n"):
                converted_line = re.sub(
                    r"(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})",
                    r"\1.\2 --> \3.\4",
                    line,
                )
                converted_lines.append(converted_line)

            vtt_content = "WEBVTT\n\n" + "\n".join(converted_lines)

            return Response(
                content=vtt_content,
                media_type="text/vtt; charset=utf-8",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "public, max-age=86400",
                },
            )

    except Exception as e:
        logger.error(f"Subtitle proxy error: {e}")
        return Response(content="WEBVTT\n\n", media_type="text/vtt; charset=utf-8")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    reload = os.environ.get("RELOAD", "false").lower() == "true"
    print(f"PARXSTREAM Ultra Streaming Server running at http://localhost:{port} (reload={reload})")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=reload)
