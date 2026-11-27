# 🍿 PARXSTREAM (MovieDekho) — Cinema Engine & Stream Platform

A modern, high-performance web-based movie discovery and streaming platform built with Python (FastAPI) and modern responsive CSS/JavaScript. Features deep TMDB catalog enrichment, dual/multi-audio track switching, realtime Bangla & English subtitles, official 4K YouTube trailers for upcoming movies, and buffer-free HTTP 206 streaming.

---

## ✨ Features

### 1. 🔍 Powerful Discovery & Search Engine
* **Realtime Autocomplete**: Instant search suggestions by title, cast, anime, and dubs.
* **Filter Drawer**: Filter by official TMDB genres, release years, minimum IMDb/TMDB ratings, and popularity/date sorting.
* **Detailed Movie Modal**: Full cast with profile photos, taglines, synopsis, runtime, and curated recommendations.

### 2. 🎬 Advanced Media Player
* Custom high-speed scrubber with hover time preview.
* Play/Pause, Rewind/Forward (10s), Volume slider, Fullscreen, and Picture-in-Picture.
* Comprehensive keyboard shortcuts (`Space`/`K` play-pause, `F` fullscreen, `M` mute, `P` PiP, `C` subtitles, arrows for skip and volume).
* Inactivity auto-hide controls.
* TV Series episode and season navigator.

### 3. ⚙️ Playback Settings Panel
* **Audio Tracks**: Detects available audio dubs (Original Audio, English, Hindi, Tamil, Telugu) and switches dynamically while preserving current playback timestamp.
* **Resolution / Quality**: Auto (Adaptive), 2160p (4K), 1080p, 720p, 480p, 360p.
* **Streaming Sources**: Multi-source mirror switcher with automatic fallback on failure.
* **Subtitles**: Native Bangla (বাংলা) and English captions fetched, cleaned, converted to WebVTT, and served with UTF-8 encoding.
* **Subtitle Customizer**: User-selectable font size, text color, background opacity, and vertical position (top/bottom).
* **Mobile-Refined Grid**: Settings tabs adapt to a clean 2-row touch grid on mobile devices with zero clipping and no horizontal scrollbars.

### 4. 🚀 Upcoming Movie 4K Trailer Engine
* Detects upcoming theatrical and digital premieres (`release_date > today`).
* Upcoming titles feature a glowing `UPCOMING` badge and **`🎬 Watch Official Trailer`** action.
* Directly launches high-definition official YouTube trailers within the cinema player.
* Prevents truncated promotional clips by automatically upgrading to official 4K trailers.
* Includes a dedicated `🎬 Trailer` button in the player bar to toggle trailers anytime.

### 5. ⚡ Buffer-Free Streaming Proxy
* Custom HTTP 206 Partial Content range proxy for instant seek without buffering.
* Bypasses CDN rate limiting, CORS restrictions, and expired cookie walls.

---

## 🛠️ Tech Stack
* **Backend**: FastAPI, Uvicorn, HTTPX, Cryptography HMAC
* **Catalog APIs**: TMDB API v3, MovieBox Core BFF
* **Frontend**: Vanilla HTML5, Modern CSS3 with Custom Properties, Vanilla JavaScript (ES6+)

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Git

### Installation & Local Run
1. Clone the repository:
   ```bash
   git clone https://github.com/parvezrepository/MovieDekho.git
   cd MovieDekho
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch the streaming server:
   ```bash
   python server.py
   ```
   *(Or double-click `run.bat` on Windows)*

4. Open your browser:
   ```
   http://localhost:8080
   ```

---

## 🐧 Linux VPS Deployment (Ubuntu / Debian / CentOS)

### Option 1: 1-Command Startup
```bash
git clone https://github.com/parvezrepository/MovieDekho.git
cd MovieDekho
chmod +x run.sh
./run.sh
```

### Option 2: 24/7 Background Systemd Service
To keep PARXSTREAM running 24/7 with auto-restart on boot:
```bash
sudo cp parxstream.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable parxstream
sudo systemctl start parxstream
sudo systemctl status parxstream
```

### Option 3: Nginx Reverse Proxy with Domain & SSL
Example Nginx configuration (`/etc/nginx/sites-available/parxstream`):
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
    }
}
```
Enable SSL with Certbot:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## 🧪 Testing

Run the full automated test suite (12/12 integration tests):
```bash
python test_server.py
```

---

## 📄 License
This project is open-source and intended for educational and personal media management purposes.
