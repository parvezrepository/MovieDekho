"""
TMDB Client - Enriched Movie Discovery, Filtering, Cast & Credits, and Recommendations
Uses user's TMDB API Key & Read Access Token.
"""

import datetime
import logging
from typing import Any, Dict, List, Optional
import httpx

logger = logging.getLogger("TMDBClient")

TMDB_API_KEY = "3c7e2985716f8f6a43a41e0dfff8bb96"
TMDB_READ_TOKEN = (
    "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzYzdlMjk4NTcxNmY4ZjZhNDNhNDFlMGRmZmY4YmI5NiIsIm5iZiI6"
    "MTc5NDA0MjgwMS4yMDIsInN1YiI6IjZhZWVlYmIxNzc3MzRhNzNkOTMyMDc4NiIsInNjb3BlcyI6WyJhcGlf"
    "cmVhZCJdLCJ2ZXJzaW9uIjoxfQ.g94o-sgA3YwCHuih_C_B-85vF2xbhnvX13wjOcRS7mg"
)
TMDB_BASE_URL = "https://api.themoviedb.org/3"
IMG_BASE_W500 = "https://image.tmdb.org/t/p/w500"
IMG_BASE_W1280 = "https://image.tmdb.org/t/p/w1280"
IMG_BASE_ORIGINAL = "https://image.tmdb.org/t/p/original"
IMG_BASE_PROFILE = "https://image.tmdb.org/t/p/w185"


class TMDBClient:
    def __init__(self, api_key: str = TMDB_API_KEY, token: str = TMDB_READ_TOKEN):
        self.api_key = api_key
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "User-Agent": "MovieBox-StreamPlatform/2.0",
        }
        self.client = httpx.Client(timeout=15, headers=self.headers)
        self._cached_genres: Optional[List[Dict[str, Any]]] = None

    def get_genres(self) -> List[Dict[str, Any]]:
        """Returns standard movie and TV genre taxonomy."""
        if self._cached_genres:
            return self._cached_genres

        url = f"{TMDB_BASE_URL}/genre/movie/list"
        try:
            resp = self.client.get(url, params={"api_key": self.api_key})
            if resp.status_code == 200:
                genres = resp.json().get("genres", [])
                self._cached_genres = genres
                return genres
        except Exception as e:
            logger.error(f"Error fetching genres: {e}")
        return []

    def get_trending_all(self, time_window: str = "week") -> List[Dict[str, Any]]:
        """Fetches trending movies and series for hero banner and discovery rows."""
        url = f"{TMDB_BASE_URL}/trending/all/{time_window}"
        try:
            resp = self.client.get(url, params={"api_key": self.api_key})
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                items = []
                for r in results:
                    title = r.get("title") or r.get("name") or "Featured Title"
                    poster_path = r.get("poster_path")
                    backdrop_path = r.get("backdrop_path")
                    media_type = r.get("media_type", "movie")
                    release_date = r.get("release_date") or r.get("first_air_date", "")
                    today_str = datetime.date.today().isoformat()
                    is_upcoming = bool(release_date and release_date > today_str)

                    items.append({
                        "tmdb_id": r.get("id"),
                        "title": title,
                        "media_type": media_type,
                        "type": "Series" if media_type == "tv" else "Movie",
                        "overview": r.get("overview", ""),
                        "rating": round(r.get("vote_average", 0), 1),
                        "year": (r.get("release_date") or r.get("first_air_date") or "")[:4],
                        "release_date": release_date,
                        "is_upcoming": is_upcoming,
                        "poster": f"{IMG_BASE_W500}{poster_path}" if poster_path else None,
                        "backdrop": f"{IMG_BASE_W1280}{backdrop_path}" if backdrop_path else None,
                        "backdrop_original": f"{IMG_BASE_ORIGINAL}{backdrop_path}" if backdrop_path else None,
                        "genre_ids": r.get("genre_ids", []),
                    })
                return items
        except Exception as e:
            logger.error(f"Error fetching TMDB trending: {e}")
        return []

    def get_upcoming_movies(self, page: int = 1) -> List[Dict[str, Any]]:
        """Fetches anticipated upcoming movies with future release dates and official trailers."""
        url = f"{TMDB_BASE_URL}/movie/upcoming"
        try:
            resp = self.client.get(
                url,
                params={"api_key": self.api_key, "page": page, "language": "en-US"},
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                items = []
                for r in results:
                    title = r.get("title") or "Upcoming Title"
                    poster_path = r.get("poster_path")
                    backdrop_path = r.get("backdrop_path")
                    rel_date = r.get("release_date") or ""
                    items.append({
                        "tmdb_id": r.get("id"),
                        "title": title,
                        "media_type": "movie",
                        "type": "Movie",
                        "category": "upcoming",
                        "overview": r.get("overview", ""),
                        "rating": round(r.get("vote_average", 0), 1),
                        "year": rel_date[:4] if rel_date else "2026",
                        "release_date": rel_date,
                        "is_upcoming": True,
                        "poster": f"{IMG_BASE_W500}{poster_path}" if poster_path else None,
                        "backdrop": f"{IMG_BASE_W1280}{backdrop_path}" if backdrop_path else None,
                        "backdrop_original": f"{IMG_BASE_ORIGINAL}{backdrop_path}" if backdrop_path else None,
                        "genre_ids": r.get("genre_ids", []),
                    })
                return items
        except Exception as e:
            logger.error(f"Error fetching upcoming movies: {e}")
        return []

    def discover(
        self,
        media_type: str = "movie",
        genre_id: Optional[int] = None,
        year: Optional[int] = None,
        rating_min: Optional[float] = None,
        sort_by: str = "popularity.desc",
        page: int = 1,
    ) -> Dict[str, Any]:
        """
        Advanced discovery engine allowing filtering by genre, release year,
        minimum user rating, and sorting criteria.
        """
        endpoint = "discover/movie" if media_type == "movie" else "discover/tv"
        url = f"{TMDB_BASE_URL}/{endpoint}"
        params: Dict[str, Any] = {
            "api_key": self.api_key,
            "page": page,
            "sort_by": sort_by,
            "include_adult": False,
        }

        if genre_id:
            params["with_genres"] = genre_id
        if year:
            if media_type == "movie":
                params["primary_release_year"] = year
            else:
                params["first_air_date_year"] = year
        if rating_min:
            params["vote_average.gte"] = rating_min
            params["vote_count.gte"] = 20  # Ensure reliable rating sample

        try:
            resp = self.client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                items = []
                for r in results:
                    title = r.get("title") or r.get("name") or "Title"
                    poster_path = r.get("poster_path")
                    backdrop_path = r.get("backdrop_path")
                    release_date = r.get("release_date") or r.get("first_air_date", "")
                    today_str = datetime.date.today().isoformat()
                    is_upcoming = bool(release_date and release_date > today_str)

                    items.append({
                        "tmdb_id": r.get("id"),
                        "title": title,
                        "media_type": media_type,
                        "type": "Series" if media_type == "tv" else "Movie",
                        "overview": r.get("overview", ""),
                        "rating": round(r.get("vote_average", 0), 1),
                        "year": (r.get("release_date") or r.get("first_air_date") or "")[:4],
                        "release_date": release_date,
                        "is_upcoming": is_upcoming,
                        "poster": f"{IMG_BASE_W500}{poster_path}" if poster_path else None,
                        "backdrop": f"{IMG_BASE_W1280}{backdrop_path}" if backdrop_path else None,
                        "genre_ids": r.get("genre_ids", []),
                    })
                return {
                    "page": data.get("page", 1),
                    "total_pages": data.get("total_pages", 1),
                    "total_results": data.get("total_results", len(items)),
                    "results": items,
                }
        except Exception as e:
            logger.error(f"Discover error: {e}")
        return {"page": page, "total_pages": 1, "total_results": 0, "results": []}

    def search_movies(
        self,
        query: str,
        year: Optional[int] = None,
        page: int = 1,
    ) -> List[Dict[str, Any]]:
        """Search movies with optional release year filter."""
        url = f"{TMDB_BASE_URL}/search/multi"
        params = {"api_key": self.api_key, "query": query, "page": page}
        try:
            resp = self.client.get(url, params=params)
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                items = []
                for r in results:
                    m_type = r.get("media_type")
                    if m_type not in ("movie", "tv"):
                        continue
                    release_date = r.get("release_date") or r.get("first_air_date") or ""
                    r_year = release_date[:4] if release_date else ""
                    if year and r_year != str(year):
                        continue

                    title = r.get("title") or r.get("name") or ""
                    poster_path = r.get("poster_path")
                    backdrop_path = r.get("backdrop_path")
                    today_str = datetime.date.today().isoformat()
                    is_upcoming = bool(release_date and release_date > today_str)

                    items.append({
                        "tmdb_id": r.get("id"),
                        "title": title,
                        "media_type": m_type,
                        "type": "Series" if m_type == "tv" else "Movie",
                        "overview": r.get("overview", ""),
                        "rating": round(r.get("vote_average", 0), 1),
                        "year": r_year,
                        "release_date": release_date,
                        "is_upcoming": is_upcoming,
                        "poster": f"{IMG_BASE_W500}{poster_path}" if poster_path else None,
                        "backdrop": f"{IMG_BASE_W1280}{backdrop_path}" if backdrop_path else None,
                    })
                return items
        except Exception as e:
            logger.error(f"Search movies error: {e}")
        return []

    def get_details(self, tmdb_id: int, media_type: str = "movie") -> Dict[str, Any]:
        """Fetches detailed metadata, tagline, runtime, genres, budget, etc."""
        endpoint = "movie" if media_type == "movie" else "tv"
        url = f"{TMDB_BASE_URL}/{endpoint}/{tmdb_id}"
        try:
            resp = self.client.get(url, params={"api_key": self.api_key})
            if resp.status_code == 200:
                data = resp.json()
                title = data.get("title") or data.get("name")
                poster = data.get("poster_path")
                backdrop = data.get("backdrop_path")
                genres = [g.get("name") for g in data.get("genres", []) if g.get("name")]
                runtime = data.get("runtime") or (data.get("episode_run_time", [None])[0] if data.get("episode_run_time") else None)
                runtime_str = f"{runtime // 60}h {runtime % 60}m" if runtime else None

                rel_date = data.get("release_date") or data.get("first_air_date", "")
                today_str = datetime.date.today().isoformat()
                status = data.get("status", "")
                if status == "Released":
                    is_upcoming = False
                else:
                    is_upcoming = bool(
                        (rel_date and rel_date > today_str)
                        or status in ("Post Production", "In Production", "Planned", "Upcoming")
                    )

                trailer = self.get_trailer(tmdb_id, media_type=media_type)

                return {
                    "tmdb_id": tmdb_id,
                    "title": title,
                    "tagline": data.get("tagline", ""),
                    "overview": data.get("overview", ""),
                    "genres": genres,
                    "rating": round(data.get("vote_average", 0), 1),
                    "vote_count": data.get("vote_count", 0),
                    "release_date": rel_date,
                    "year": rel_date[:4] if rel_date else "",
                    "runtime": runtime_str,
                    "status": status,
                    "is_upcoming": is_upcoming,
                    "trailer": trailer,
                    "poster": f"{IMG_BASE_W500}{poster}" if poster else None,
                    "backdrop": f"{IMG_BASE_W1280}{backdrop}" if backdrop else None,
                }
        except Exception as e:
            logger.error(f"Error fetching details for {tmdb_id}: {e}")
        return {}

    def get_credits(self, tmdb_id: int, media_type: str = "movie") -> List[Dict[str, Any]]:
        """Retrieves cast and key crew members with profile images."""
        endpoint = "movie" if media_type == "movie" else "tv"
        url = f"{TMDB_BASE_URL}/{endpoint}/{tmdb_id}/credits"
        try:
            resp = self.client.get(url, params={"api_key": self.api_key})
            if resp.status_code == 200:
                cast = resp.json().get("cast", [])
                items = []
                for c in cast[:12]:
                    profile = c.get("profile_path")
                    items.append({
                        "name": c.get("name"),
                        "character": c.get("character"),
                        "profile_img": f"{IMG_BASE_PROFILE}{profile}" if profile else None,
                    })
                return items
        except Exception as e:
            logger.error(f"Error fetching credits for {tmdb_id}: {e}")
        return []

    def get_recommendations(
        self,
        tmdb_id: int,
        media_type: str = "movie",
        page: int = 1,
    ) -> List[Dict[str, Any]]:
        """Retrieves related and recommended titles with pagination and similar fallback."""
        endpoint = "movie" if media_type == "movie" else "tv"
        url = f"{TMDB_BASE_URL}/{endpoint}/{tmdb_id}/recommendations"
        try:
            resp = self.client.get(url, params={"api_key": self.api_key, "page": page})
            results = []
            if resp.status_code == 200:
                results = resp.json().get("results", [])

            # If recommendations are few, augment with similar titles
            if len(results) < 8:
                sim_url = f"{TMDB_BASE_URL}/{endpoint}/{tmdb_id}/similar"
                sim_resp = self.client.get(sim_url, params={"api_key": self.api_key, "page": page})
                if sim_resp.status_code == 200:
                    sim_results = sim_resp.json().get("results", [])
                    existing_ids = {r.get("id") for r in results}
                    for sr in sim_results:
                        if sr.get("id") not in existing_ids:
                            results.append(sr)

            today_str = datetime.date.today().isoformat()
            items = []
            for r in results:
                title = r.get("title") or r.get("name")
                poster_path = r.get("poster_path")
                backdrop_path = r.get("backdrop_path")
                rel_date = r.get("release_date") or r.get("first_air_date") or ""
                is_upcoming = bool(rel_date and rel_date > today_str)

                items.append({
                    "tmdb_id": r.get("id"),
                    "title": title,
                    "type": "Series" if media_type == "tv" else "Movie",
                    "rating": round(r.get("vote_average", 0), 1),
                    "year": rel_date[:4] if rel_date else "2024",
                    "release_date": rel_date,
                    "is_upcoming": is_upcoming,
                    "poster": f"{IMG_BASE_W500}{poster_path}" if poster_path else None,
                    "backdrop": f"{IMG_BASE_W1280}{backdrop_path}" if backdrop_path else None,
                })
            return items
        except Exception as e:
            logger.error(f"Error fetching recommendations: {e}")
        return []

    def get_trailer(self, tmdb_id: int, media_type: str = "movie") -> Optional[Dict[str, Any]]:
        """
        Retrieves the best official YouTube trailer for a movie or TV show.
        Prioritizes official trailers, 4K/1080p, and latest releases.
        """
        endpoint = "movie" if media_type == "movie" else "tv"
        url = f"{TMDB_BASE_URL}/{endpoint}/{tmdb_id}/videos"
        try:
            resp = self.client.get(url, params={"api_key": self.api_key})
            if resp.status_code == 200:
                videos = resp.json().get("results", [])
                yt_videos = [v for v in videos if v.get("site") == "YouTube" and v.get("key")]
                if not yt_videos:
                    return None

                # 1. Official Trailer
                official_trailers = [
                    v for v in yt_videos if v.get("type") == "Trailer" and v.get("official")
                ]
                if official_trailers:
                    official_trailers.sort(
                        key=lambda x: (x.get("size", 0), x.get("published_at", "")), reverse=True
                    )
                    best = official_trailers[0]
                else:
                    # 2. Any Trailer
                    any_trailers = [v for v in yt_videos if v.get("type") == "Trailer"]
                    if any_trailers:
                        any_trailers.sort(
                            key=lambda x: (x.get("size", 0), x.get("published_at", "")), reverse=True
                        )
                        best = any_trailers[0]
                    else:
                        # 3. Official Teaser
                        official_teasers = [
                            v for v in yt_videos if v.get("type") == "Teaser" and v.get("official")
                        ]
                        if official_teasers:
                            best = official_teasers[0]
                        else:
                            # 4. Any Teaser / Clip
                            best = yt_videos[0]

                key = best.get("key")
                return {
                    "key": key,
                    "name": best.get("name", "Official Trailer"),
                    "type": best.get("type", "Trailer"),
                    "size": best.get("size", 1080),
                    "embed_url": f"https://www.youtube-nocookie.com/embed/{key}?autoplay=1&rel=0&modestbranding=1",
                    "youtube_url": f"https://www.youtube.com/watch?v={key}",
                }
        except Exception as e:
            logger.error(f"Error fetching trailer for {tmdb_id}: {e}")
        return None


# Global singleton instance
tmdb = TMDBClient()
