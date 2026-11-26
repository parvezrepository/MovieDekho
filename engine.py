"""
MovieBox Engine - Robust API client for MovieBox streaming and metadata extraction.
Handles cryptographic request signatures, device token bootstrapping, search,
stream resolution (1080p/720p/480p/360p), subtitle tracks, and audio dubs.
"""

import base64
import hashlib
import hmac
import json
import logging
import re
import secrets
import sys
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

try:
    from curl_cffi import requests as cr
except ImportError:
    cr = None
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MovieBoxEngine")

# Upstream API constants
SECRET_KEY_DEFAULT_B64 = "NzZpUmwwN3MweFNOOWpxbUVXQXQ3OUVCSlp1bElRSXNWNjRGWnIyTw=="
SECRET_KEY_ALT_B64 = "WHFuMm5uTzQxL0w5Mm8xaXVYaFNMSFRiWHZZNFo1Wlo2Mm04bVNMQQ=="
MODERN_USER_AGENT = "com.community.mbox.in/50020130 (Linux; U; Android 14; en_IN; Pixel 8; Build/UD1A.230803.041; Cronet/145.0.7582.0)"
WEB_USER_AGENT = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36"
API_BASE = "https://h5-api.aoneroom.com/wefeed-h5api-bff"
NATIVE_API_BASE = "https://api3.aoneroom.com"
BOOTSTRAP_HOST = "https://apig.inmoviebox.com"
BOOTSTRAP_URL = f"{BOOTSTRAP_HOST}/wefeed-mobile-bff/tab/ranking-list?tabId=0&categoryType=4516404531735022304&page=1&perPage=1"

WEB_DOMAINS = [
    "https://123moviesfree.club",
    "https://movie-box.co",
    "https://movieboxonline.net",
    "https://sflix.film",
    "https://h5-api.aoneroom.com",
    "https://netnaija.film",
    "https://movieboxhd.net",
]


def _b64decode(s: str) -> bytes:
    """Safely decodes URL-safe base64 strings with padding adjustment."""
    s = s.replace("-", "+").replace("_", "/")
    s += "=" * (-len(s) % 4)
    return base64.b64decode(s)


def get_secret_bytes(use_alt_key: bool = False) -> bytes:
    """Decodes two-layer base64 HMAC secret key."""
    outer = SECRET_KEY_ALT_B64 if use_alt_key else SECRET_KEY_DEFAULT_B64
    inner = _b64decode(outer).decode("utf-8")
    return _b64decode(inner)


def md5_hex(data: bytes) -> str:
    """Computes MD5 hex digest."""
    return hashlib.md5(data).hexdigest()


def generate_device_id() -> str:
    """Generates random 16-byte hex device identifier."""
    return secrets.token_hex(16)


def generate_x_client_token(timestamp: int) -> str:
    """Generates client security token required by upstream endpoints."""
    ts_str = str(timestamp)
    reversed_ts = ts_str[::-1].encode("utf-8")
    return f"{ts_str},{md5_hex(reversed_ts)}"


def generate_client_info(device_id: str) -> str:
    """Generates standard Android device profile payload for upstream API."""
    return json.dumps(
        {
            "package_name": "com.community.mbox.in",
            "version_name": "4.0.03.0920.03",
            "version_code": 50020130,
            "os": "android",
            "os_version": "14",
            "device_id": device_id,
            "install_store": "official",
            "gaid": "1b2212c1-dadf-43c3-a0c8-bd6ce48ae22d",
            "brand": "Google",
            "model": "Pixel 8",
            "system_language": "en",
            "net": "NETWORK_WIFI",
            "region": "IN",
            "timezone": "Asia/Calcutta",
            "sp_code": "",
        },
        separators=(",", ":"),
    )


def build_canonical_string(
    method: str,
    accept: Optional[str],
    content_type: Optional[str],
    url: str,
    body: Optional[str],
    timestamp: int,
) -> str:
    """Constructs canonical string representation for HMAC request signing."""
    parsed = urlsplit(url)
    path = parsed.path or "/"
    if parsed.query:
        pairs = []
        for segment in parsed.query.split("&"):
            if not segment:
                continue
            pieces = segment.split("=", 1)
            pairs.append((pieces[0], pieces[1] if len(pieces) > 1 else ""))
        pairs.sort(key=lambda kv: kv[0])
        canonical_query = "&".join(f"{k}={v}" for k, v in pairs)
        canonical_url = f"{path}?{canonical_query}"
    else:
        canonical_url = path

    body_bytes = body.encode("utf-8") if body is not None else None
    if body_bytes:
        body_length = str(len(body_bytes))
        body_hash = md5_hex(body_bytes[:102400])
    else:
        body_length = ""
        body_hash = ""

    return "\n".join(
        [
            method.upper(),
            accept or "",
            content_type or "",
            body_length,
            str(timestamp),
            body_hash,
            canonical_url,
        ]
    )


def generate_x_tr_signature(
    method: str,
    accept: Optional[str],
    content_type: Optional[str],
    url: str,
    body: Optional[str],
    timestamp: int,
    use_alt_key: bool = False,
) -> str:
    """Signs request with HMAC-MD5 signature for MovieBox anti-tamper verification."""
    canonical = build_canonical_string(method, accept, content_type, url, body, timestamp)
    key = get_secret_bytes(use_alt_key)
    digest = hmac.new(key, canonical.encode("utf-8"), hashlib.md5).digest()
    sig_b64 = base64.b64encode(digest).decode("ascii")
    return f"{timestamp}|2|{sig_b64}"


def build_auth_headers(
    method: str,
    url: str,
    body: Optional[str] = None,
    token: Optional[str] = None,
    device_id: Optional[str] = None,
    use_alt_key: bool = False,
    content_type: str = "application/json",
    accept: str = "application/json",
) -> Dict[str, str]:
    """Generates all cryptographic authentication headers required by MovieBox servers."""
    ts = int(time.time() * 1000)
    dev_id = device_id or generate_device_id()
    headers = {
        "user-agent": MODERN_USER_AGENT,
        "accept": accept,
        "content-type": content_type,
        "connection": "keep-alive",
        "x-client-token": generate_x_client_token(ts),
        "x-tr-signature": generate_x_tr_signature(method, accept, content_type, url, body, ts, use_alt_key),
        "x-client-info": generate_client_info(dev_id),
        "x-client-status": "0",
    }
    if token:
        headers["authorization"] = f"Bearer {token}"
    return headers


def extract_policy_resource(sign_cookie: Optional[str]) -> Optional[str]:
    """Decodes signed CloudFront and Edge-Cache-Cookie tokens to extract stream manifest URLs."""
    if not sign_cookie:
        return None
    m_edge = re.search(r"Edge-Cache-Cookie=urlprefix=([^:;\s]+)", sign_cookie)
    if m_edge:
        try:
            decoded = _b64decode(m_edge.group(1)).decode("utf-8").rstrip("/")
            return decoded + "/index.mpd"
        except Exception:
            pass
    m_cf = re.search(r"CloudFront-Policy=([^;]+)", sign_cookie)
    if m_cf:
        raw = m_cf.group(1)
        for t in ("cf", "std"):
            try:
                b = raw.replace("-", "+").replace("_", "=") if t == "cf" else raw
                b += "=" * (-len(b) % 4)
                data = json.loads(base64.b64decode(b).decode("utf-8"))
                for s in data.get("Statement", []):
                    res = s.get("Resource")
                    if res:
                        return res.rstrip("*").rstrip("/") + "/index.mpd"
            except Exception:
                pass
    return None


class MovieBoxEngine:
    """Singleton engine orchestrating Moviebox API interactions."""
    _instance: Optional["MovieBoxEngine"] = None

    def __init__(self):
        self.device_id = generate_device_id()
        self.bearer_token: Optional[str] = None
        self.token_expiry: float = 0
        if cr:
            try:
                self.session = cr.Session(impersonate="chrome120")
            except Exception as e:
                logger.warning(f"curl_cffi failed to init impersonation: {e}, using httpx fallback")
                self.session = httpx.Client(timeout=25, follow_redirects=True)
        else:
            self.session = httpx.Client(timeout=25, follow_redirects=True)

    @classmethod
    def get_instance(cls) -> "MovieBoxEngine":
        if cls._instance is None:
            cls._instance = MovieBoxEngine()
        return cls._instance

    def bootstrap_token(self, force: bool = False) -> str:
        """Bootstraps anonymous user bearer token from MovieBox authentication gateways."""
        now = time.time()
        if self.bearer_token and not force and (now < self.token_expiry - 60):
            return self.bearer_token

        headers = build_auth_headers("GET", BOOTSTRAP_URL, device_id=self.device_id)
        try:
            resp = self.session.get(BOOTSTRAP_URL, headers=headers, timeout=20)
            x_user = resp.headers.get("x-user")
            if not x_user:
                raise Exception("Failed to bootstrap MovieBox token: x-user header missing")
            token_data = json.loads(x_user)
            token = token_data.get("token")
            if not token:
                raise Exception("Empty token received in upstream response")
            self.bearer_token = token
            self.token_expiry = now + 3600  # Default to 1 hr valid
            return token
        except Exception as e:
            logger.error(f"Bootstrap token error: {e}")
            if self.bearer_token:
                return self.bearer_token
            raise e

    def api_request(
        self,
        method: str,
        path_or_url: str,
        body_dict: Optional[Dict[str, Any]] = None,
        use_token: bool = True,
        retry_auth: bool = True,
    ) -> Dict[str, Any]:
        """Makes authenticated requests to native MovieBox endpoints with automatic token retry."""
        if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
            full_url = path_or_url
        else:
            full_url = f"{NATIVE_API_BASE}{path_or_url}"

        if use_token and not self.bearer_token:
            self.bootstrap_token()

        body_str = json.dumps(body_dict, separators=(",", ":")) if body_dict is not None else None
        headers = build_auth_headers(
            method=method,
            url=full_url,
            body=body_str,
            token=self.bearer_token if use_token else None,
            device_id=self.device_id,
        )
        data_bytes = body_str.encode("utf-8") if body_str is not None else None

        try:
            if method.upper() == "POST":
                resp = self.session.post(full_url, headers=headers, data=data_bytes, timeout=25)
            else:
                resp = self.session.get(full_url, headers=headers, timeout=25)

            if resp.status_code in (401, 441) and retry_auth:
                logger.info("Upstream token expired, bootstrapping fresh token...")
                self.bootstrap_token(force=True)
                return self.api_request(method, path_or_url, body_dict, use_token, retry_auth=False)

            if resp.status_code != 200:
                logger.warning(f"Upstream returned HTTP {resp.status_code} for {full_url}")
                return {}

            return resp.json()
        except Exception as e:
            logger.error(f"API request failed on {full_url}: {e}")
            return {}

    def search(self, query: str, page: int = 1, per_page: int = 20) -> List[Dict[str, Any]]:
        """Searches MovieBox catalog for movies and TV series matching keyword."""
        # Upstream API requires perPage <= 20
        safe_per_page = min(max(1, per_page), 20)
        payload = {"keyword": query, "page": page, "perPage": safe_per_page}
        url = "/wefeed-mobile-bff/subject-api/search"
        data = self.api_request("POST", url, body_dict=payload).get("data", {})
        raw_items = data.get("items", []) or data.get("list", [])
        results = []
        for item in raw_items:
            sub = item.get("subject", item)
            results.append({
                "subject_id": str(sub.get("subjectId")),
                "title": sub.get("title"),
                "type": "Movie" if sub.get("subjectType") == 1 else "Series",
                "subject_type": sub.get("subjectType", 1),
                "release_date": sub.get("releaseDate"),
                "imdb_rating": sub.get("imdbRatingValue"),
                "genre": sub.get("genre"),
                "cover": sub.get("cover", {}).get("url") if isinstance(sub.get("cover"), dict) else None,
                "detail_path": sub.get("detailPath"),
                "language": sub.get("language") or "English",
            })
        return results

    def get_details(self, subject_id: str) -> Dict[str, Any]:
        """Fetches title details, synopsis, duration, rating, genres, and audio dub tracks."""
        url = f"/wefeed-mobile-bff/subject-api/get?subjectId={subject_id}"
        data = self.api_request("GET", url).get("data", {})
        detail_url_str = data.get("detailUrl", "")
        detail_path = detail_url_str.split("/")[-1] if "/" in detail_url_str else detail_url_str

        dubs = []
        for d in data.get("dubs", []):
            if isinstance(d, dict) and d.get("subjectId"):
                dubs.append({
                    "subject_id": str(d.get("subjectId")),
                    "lang_name": d.get("lanName") or d.get("language") or "Dub",
                    "language": d.get("language"),
                })

        return {
            "subject_id": str(data.get("subjectId") or subject_id),
            "title": data.get("title", "Unknown Title"),
            "subject_type": data.get("subjectType", 1),
            "type": "Movie" if data.get("subjectType") == 1 else "Series",
            "description": data.get("description", "No description available."),
            "release_date": data.get("releaseDate"),
            "duration": data.get("duration"),
            "imdb_rating": data.get("imdbRatingValue", "N/A"),
            "genre": data.get("genre", ""),
            "country": data.get("countryName", ""),
            "language": data.get("language", "English"),
            "cover": data.get("cover", {}).get("url") if isinstance(data.get("cover"), dict) else None,
            "detail_path": detail_path,
            "dubs": dubs,
        }

    def get_episodes(self, subject_id: str) -> List[Dict[str, Any]]:
        """Retrieves season numbers, episode counts, and resolution availability for a TV series."""
        url = f"/wefeed-mobile-bff/subject-api/season-info?subjectId={subject_id}"
        res = self.api_request("GET", url)
        seasons = res.get("data", {}).get("seasons", [])
        season_list = []
        for s in seasons:
            season_list.append({
                "season": s.get("se", 1),
                "episode_count": s.get("maxEp", 1),
                "resolutions": s.get("resolutions", []),
            })
        return season_list

    def get_streams(
        self,
        subject_id: str,
        season: int = 0,
        episode: int = 0,
        detail_path: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Resolves direct MP4 and DASH streams across web and mobile CDNs."""
        if not detail_path:
            try:
                details = self.get_details(subject_id)
                detail_path = details.get("detail_path", "")
            except Exception:
                detail_path = ""

        try:
            token = self.bootstrap_token()
        except Exception:
            token = ""

        streams: List[Dict[str, Any]] = []
        seen_urls = set()

        # 1. Resolve from Web Mirror CDNs
        for domain in WEB_DOMAINS:
            play_url = (
                f"{domain}/wefeed-h5api-bff/subject/play?"
                f"subjectId={subject_id}&se={season}&ep={episode}&detailPath={detail_path}&"
                f"streamSignType=1&supportCodecs%5Bhevc%5D=1&supportCodecs%5Bh264%5D=1"
            )
            referer = f"{domain}/movies/{detail_path}?id={subject_id}&type=/movie/detail&detailSe=&detailEp=&lang=en"
            headers = {
                "User-Agent": WEB_USER_AGENT,
                "Referer": referer,
                "Accept": "application/json",
                "x-client-info": '{"timezone":"Asia/Calcutta"}',
                "x-request-lang": "en",
                "x-vip-restrict": "0",
                "x-no-high-risk-restrict": "0",
                "x-source": "moviebox",
                "Authorization": f"Bearer {token}",
            }
            try:
                resp = self.session.get(play_url, headers=headers, timeout=12)
                if resp.status_code != 200:
                    continue
                data = resp.json().get("data", {})
                raw_streams = data.get("streams", [])
                dash_items = data.get("dash", [])

                if raw_streams or dash_items:
                    for st in raw_streams:
                        url = st.get("url")
                        if not url or url in seen_urls:
                            continue
                        seen_urls.add(url)
                        res_str = str(st.get("resolutions", "unknown"))
                        size_bytes = int(st.get("size") or 0)
                        size_mb = size_bytes / (1024 * 1024) if size_bytes else 0
                        quality_val = 0
                        for q in (2160, 1440, 1080, 720, 480, 360, 240):
                            if str(q) in res_str:
                                quality_val = q
                                break
                        streams.append({
                            "source": f"Web CDN ({domain})",
                            "format": st.get("format", "MP4"),
                            "quality": f"{quality_val}p" if quality_val else res_str,
                            "quality_value": quality_val,
                            "resolution_tag": res_str,
                            "url": url,
                            "size_mb": round(size_mb, 1),
                            "codec": st.get("codecName"),
                            "duration_sec": st.get("duration"),
                            "headers": {
                                "User-Agent": "Mozilla/5.0",
                                "Referer": f"{domain}/",
                                "Origin": domain,
                            },
                        })

                    for d in dash_items:
                        url = d.get("url")
                        cookie = d.get("signCookie")
                        extracted_mpd = extract_policy_resource(cookie) if cookie else None
                        final_url = extracted_mpd or url
                        if final_url and final_url not in seen_urls:
                            seen_urls.add(final_url)
                            res_tag = str(d.get("resolutions", "adaptive"))
                            streams.append({
                                "source": f"Web DASH ({domain})",
                                "format": "DASH",
                                "quality": "1080p (Adaptive)" if "1080" in res_tag else "Adaptive",
                                "quality_value": 1080 if "1080" in res_tag else 999,
                                "resolution_tag": res_tag,
                                "url": final_url,
                                "size_mb": 0,
                                "codec": "hevc/h264",
                                "duration_sec": None,
                                "cookie": cookie,
                                "headers": {
                                    "User-Agent": "Mozilla/5.0",
                                    "Referer": f"{domain}/",
                                    "Origin": domain,
                                },
                            })
                    break
            except Exception:
                continue

        # 2. Resolve from Native Mobile CDN
        try:
            native_url = f"/wefeed-mobile-bff/subject-api/play-info?subjectId={subject_id}&se={season}&ep={episode}"
            native_data = self.api_request("GET", native_url).get("data", {})
            for st in native_data.get("streams", []):
                raw_url = st.get("url")
                if not raw_url or "b164fbfb4347792950bdfbfb563d39d9" in raw_url:
                    continue
                cookie = st.get("signCookie")
                policy_url = extract_policy_resource(cookie) if cookie else None
                final_url = policy_url or raw_url
                if final_url in seen_urls:
                    continue
                seen_urls.add(final_url)
                res_str = str(st.get("resolutions", ""))
                quality_val = 0
                for q in (2160, 1440, 1080, 720, 480, 360, 240):
                    if str(q) in res_str:
                        quality_val = q
                        break
                size_bytes = int(st.get("size") or 0)
                size_mb = size_bytes / (1024 * 1024) if size_bytes else 0
                streams.append({
                    "source": "Mobile Native CDN",
                    "format": "DASH" if (policy_url or ".mpd" in final_url) else st.get("format", "MP4"),
                    "quality": f"{quality_val}p" if quality_val else (res_str or "Default"),
                    "quality_value": quality_val,
                    "resolution_tag": res_str,
                    "url": final_url,
                    "size_mb": round(size_mb, 1),
                    "codec": st.get("codecName"),
                    "duration_sec": st.get("duration"),
                    "headers": {
                        "User-Agent": MODERN_USER_AGENT,
                        "Referer": "https://api3.aoneroom.com/",
                    },
                })
        except Exception as e:
            logger.warning(f"Native stream resolution error: {e}")

        # Sort highest quality first
        streams.sort(key=lambda s: s["quality_value"], reverse=True)
        return streams

    def get_subtitles(
        self,
        subject_id: str,
        stream_id: Optional[str] = None,
        season: int = 0,
        episode: int = 0,
    ) -> List[Dict[str, Any]]:
        """Extracts subtitle tracks (SRT/VTT) with signed tokens for Bangla, English, etc."""
        subs: List[Dict[str, Any]] = []
        seen_urls = set()

        if not stream_id:
            try:
                native_url = f"/wefeed-mobile-bff/subject-api/play-info?subjectId={subject_id}&se={season}&ep={episode}"
                raw_streams = self.api_request("GET", native_url).get("data", {}).get("streams", [])
                if raw_streams and raw_streams[0].get("id"):
                    stream_id = str(raw_streams[0]["id"])
            except Exception:
                pass

        def _add_sub(item: Dict[str, Any]):
            u = item.get("url")
            if u and u not in seen_urls:
                seen_urls.add(u)
                raw_lang = item.get("lanName") or item.get("language") or "English"
                code = item.get("lan", "") or item.get("code", "")
                
                # Standardize Bangla labels
                if code == "bn" or "বাংলা" in raw_lang or raw_lang == "BD":
                    display_lang = "Bangla (বাংলা)"
                    code = "bn"
                elif code == "en" or "English" in raw_lang:
                    display_lang = "English"
                    code = "en"
                elif code == "hi" or "हिन्दी" in raw_lang or "Hindi" in raw_lang:
                    display_lang = "Hindi (हिन्दी)"
                    code = "hi"
                else:
                    display_lang = raw_lang

                subs.append({
                    "id": str(item.get("id", "")),
                    "language": display_lang,
                    "code": code,
                    "url": u,
                    "size": item.get("size"),
                })

        if stream_id:
            try:
                url = f"/wefeed-mobile-bff/subject-api/get-stream-captions?subjectId={subject_id}&streamId={stream_id}"
                data = self.api_request("GET", url).get("data", {})
                captions = data if isinstance(data, list) else data.get("extCaptions") or data.get("captions") or []
                for s in captions:
                    if isinstance(s, dict):
                        _add_sub(s)
            except Exception:
                pass

        try:
            res_id = stream_id or "0"
            url = f"/wefeed-mobile-bff/subject-api/get-ext-captions?subjectId={subject_id}&resourceId={res_id}&episode={episode}"
            data = self.api_request("GET", url).get("data", {})
            ext = data if isinstance(data, list) else data.get("extCaptions") or data.get("captions") or []
            for s in ext:
                if isinstance(s, dict):
                    _add_sub(s)
        except Exception:
            pass

        # Sort so Bangla and English come first
        def _sort_key(s):
            c = s.get("code", "")
            if c == "bn":
                return 0
            if c == "en":
                return 1
            if c == "hi":
                return 2
            return 3

        subs.sort(key=_sort_key)
        return subs
