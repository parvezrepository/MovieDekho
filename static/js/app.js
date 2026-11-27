/**
 * MovieBox Cinema Engine — Advanced Movie Discovery & Stream Player Client
 * Features:
 * - Realtime keyword search with release year filtering & instant autocomplete
 * - Category discovery: Genre filters, release year, minimum ratings, sorting
 * - Detailed Movie modal: High-res backdrops, full cast & characters, recommendations
 * - Advanced Media Player:
 *   - Custom scrubber with timeline hover preview tooltip
 *   - Volume slider, playback speed (0.5x - 2x), Picture-in-Picture, Fullscreen
 *   - Inactivity auto-hide controls
 *   - Comprehensive keyboard shortcuts
 * - Player Settings Panel:
 *   - Audio Track switching (Original, English, Hindi dubs) with time preservation
 *   - Video Quality switching (1080p, 720p, 480p, 360p, Auto) with time preservation
 *   - Source / Mirror selection (Web CDN, Mobile Native CDN)
 *   - Subtitles: Bangla (বাংলা), English, multi-language, external SRT upload
 *   - Subtitle Customizer: font size, text color, background style, vertical position
 */

// Global Application State
const state = {
    // Current Media State
    currentSubjectId: null,
    currentTmdbId: null,
    currentTitle: "",
    currentOverview: "",
    isSeries: false,
    currentSeason: 1,
    currentEpisode: 1,
    seasonsData: [],

    // Streaming & Sources State
    availableStreams: [],
    currentStream: null,
    availableAudios: [],
    currentAudioId: null,
    availableCaptions: [],
    activeSubtitleCode: "off",

    // Playback Settings
    playbackSpeed: 1.0,
    volume: 1.0,
    isMuted: false,

    // Subtitle Customization
    subtitleStyle: {
        fontSize: "1.15rem",
        color: "#ffffff",
        background: "rgba(0, 0, 0, 0.75)",
        position: "bottom",
    },

    // Discovery & Search State
    genres: [],
    heroItem: null,
    searchDebounceTimer: null,
    controlsHideTimer: null,
    isUserScrubbing: false,
    currentMediaItem: null,

    // Infinite Scroll & Pagination State
    activeTab: "home",
    catalogPage: 1,
    isCatalogLoading: false,
    catalogHasMore: true,
    searchCurrentQuery: "",
    searchCurrentYear: null,
    activeFilterParams: null,

    // Recommendations Pagination (Modal)
    detailActiveTmdbId: null,
    detailActiveMediaType: "movie",
    detailRecPage: 1,
    detailRecLoading: false,
    detailRecHasMore: true,
};

// DOM Elements Cache
const elements = {
    // Navigation & Search
    searchInput: document.getElementById("searchInput"),
    searchYearSelect: document.getElementById("searchYearSelect"),
    clearSearchBtn: document.getElementById("clearSearchBtn"),
    suggestBox: document.getElementById("suggestBox"),
    filterBar: document.getElementById("filterBar"),
    genreFilter: document.getElementById("genreFilter"),
    yearFilter: document.getElementById("yearFilter"),
    ratingFilter: document.getElementById("ratingFilter"),
    sortByFilter: document.getElementById("sortByFilter"),

    // Catalog & Grids
    heroBanner: document.getElementById("heroBanner"),
    heroBackdrop: document.getElementById("heroBackdrop"),
    heroTitle: document.getElementById("heroTitle"),
    heroOverview: document.getElementById("heroOverview"),
    heroRating: document.getElementById("heroRating"),
    heroType: document.getElementById("heroType"),
    heroWatchBtn: document.getElementById("heroWatchBtn"),
    heroWatchBtnText: document.getElementById("heroWatchBtnText"),
    searchSection: document.getElementById("searchSection"),
    searchHeader: document.getElementById("searchHeader"),
    searchSubheader: document.getElementById("searchSubheader"),
    searchResultsGrid: document.getElementById("searchResultsGrid"),
    trendingGrid: document.getElementById("trendingGrid"),
    moviesGrid: document.getElementById("moviesGrid"),
    seriesGrid: document.getElementById("seriesGrid"),
    animeGrid: document.getElementById("animeGrid"),
    animeSection: document.getElementById("animeSection"),
    navAnime: document.getElementById("navAnime"),
    catalogInfiniteLoader: document.getElementById("catalogInfiniteLoader"),
    catalogInfiniteSentinel: document.getElementById("catalogInfiniteSentinel"),

    // Details Modal
    detailModal: document.getElementById("detailModal"),
    detailHero: document.getElementById("detailHero"),
    detailPoster: document.getElementById("detailPoster"),
    detailTitle: document.getElementById("detailTitle"),
    detailTagline: document.getElementById("detailTagline"),
    detailType: document.getElementById("detailType"),
    detailRating: document.getElementById("detailRating"),
    detailYear: document.getElementById("detailYear"),
    detailDuration: document.getElementById("detailDuration"),
    detailGenres: document.getElementById("detailGenres"),
    detailOverview: document.getElementById("detailOverview"),
    detailCastGrid: document.getElementById("detailCastGrid"),
    detailRecommendationsGrid: document.getElementById("detailRecommendationsGrid"),
    detailRecommendationsLoadMoreWrap: document.getElementById("detailRecommendationsLoadMoreWrap"),
    detailRecommendationsLoadMoreBtn: document.getElementById("detailRecommendationsLoadMoreBtn"),
    detailRecInfiniteSpinner: document.getElementById("detailRecInfiniteSpinner"),
    detailRecSentinel: document.getElementById("detailRecSentinel"),
    detailWatchBtn: document.getElementById("detailWatchBtn"),
    detailWatchBtnText: document.getElementById("detailWatchBtnText"),

    // Video Player Shell & Controls
    playerModal: document.getElementById("playerModal"),
    videoContainer: document.getElementById("videoContainer"),
    videoPlayer: document.getElementById("videoPlayer"),
    playerLoader: document.getElementById("playerLoader"),
    playerLoaderText: document.getElementById("playerLoaderText"),
    playerTitle: document.getElementById("playerTitle"),
    playerEpisodeTag: document.getElementById("playerEpisodeTag"),
    playerQualityTag: document.getElementById("playerQualityTag"),
    playerSourceTag: document.getElementById("playerSourceTag"),
    playerAudioTag: document.getElementById("playerAudioTag"),
    playerSubTag: document.getElementById("playerSubTag"),
    playerControlsOverlay: document.getElementById("playerControlsOverlay"),
    centerPlayIndicator: document.getElementById("centerPlayIndicator"),
    customSubtitleLayer: document.getElementById("customSubtitleLayer"),

    // Controls Toolbar Elements
    playBtn: document.getElementById("playBtn"),
    playIcon: document.getElementById("playIcon"),
    pauseIcon: document.getElementById("pauseIcon"),
    progressBarContainer: document.getElementById("progressBarContainer"),
    progressTrack: document.querySelector(".progress-track"),
    progressPlayed: document.getElementById("progressPlayed"),
    progressBuffered: document.getElementById("progressBuffered"),
    progressThumb: document.getElementById("progressThumb"),
    timeTooltip: document.getElementById("timeTooltip"),
    currentTimeDisplay: document.getElementById("currentTimeDisplay"),
    durationDisplay: document.getElementById("durationDisplay"),
    volumeBtn: document.getElementById("volumeBtn"),
    volumeSlider: document.getElementById("volumeSlider"),
    volumeHighIcon: document.getElementById("volumeHighIcon"),
    volumeMutedIcon: document.getElementById("volumeMutedIcon"),
    prevEpPlayerBtn: document.getElementById("prevEpPlayerBtn"),
    nextEpPlayerBtn: document.getElementById("nextEpPlayerBtn"),
    ccToggleBtn: document.getElementById("ccToggleBtn"),
    enterFullscreenIcon: document.getElementById("enterFullscreenIcon"),
    exitFullscreenIcon: document.getElementById("exitFullscreenIcon"),

    // Settings Panel
    playerSettingsPanel: document.getElementById("playerSettingsPanel"),
    audioOptionsList: document.getElementById("audioOptionsList"),
    qualityOptionsList: document.getElementById("qualityOptionsList"),
    sourceOptionsList: document.getElementById("sourceOptionsList"),
    subtitleOptionsList: document.getElementById("subtitleOptionsList"),
    subFontSizeSelect: document.getElementById("subFontSizeSelect"),
    subColorSelect: document.getElementById("subColorSelect"),
    subBgSelect: document.getElementById("subBgSelect"),
    subPosSelect: document.getElementById("subPosSelect"),

    // TV Series Bar
    seriesControls: document.getElementById("seriesControls"),
    seasonTabs: document.getElementById("seasonTabs"),
    episodeGrid: document.getElementById("episodeGrid"),

    // Feedback
    toast: document.getElementById("toastNotification"),
};

// ==========================================================================
// App Initialization
// ==========================================================================
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

async function initApp() {
    renderSkeletons();
    loadSavedSettings();
    setupEventListeners();
    setupCatalogInfiniteScroll();
    setupModalInfiniteScroll();
    await Promise.allSettled([loadGenres(), loadHomeFeed()]);
}

function renderSkeletons() {
    const skeletonHtml = Array(6)
        .fill(0)
        .map(
            () => `
        <div class="media-card skeleton-card">
            <div class="card-poster-wrap skeleton-pulse"></div>
            <div class="card-info">
                <div class="skeleton-line skeleton-pulse" style="width: 80%; height: 14px; margin-bottom: 6px;"></div>
                <div class="skeleton-line skeleton-pulse" style="width: 40%; height: 10px;"></div>
            </div>
        </div>
    `
        )
        .join("");

    if (elements.trendingGrid && elements.trendingGrid.children.length === 0) {
        elements.trendingGrid.innerHTML = skeletonHtml;
    }
    if (elements.moviesGrid && elements.moviesGrid.children.length === 0) {
        elements.moviesGrid.innerHTML = skeletonHtml;
    }
    if (elements.seriesGrid && elements.seriesGrid.children.length === 0) {
        elements.seriesGrid.innerHTML = skeletonHtml;
    }
}

function loadSavedSettings() {
    try {
        const savedSub = localStorage.getItem("mbox_subtitle_style");
        if (savedSub) {
            state.subtitleStyle = { ...state.subtitleStyle, ...JSON.parse(savedSub) };
            if (elements.subFontSizeSelect) elements.subFontSizeSelect.value = state.subtitleStyle.fontSize;
            if (elements.subColorSelect) elements.subColorSelect.value = state.subtitleStyle.color;
            if (elements.subBgSelect) elements.subBgSelect.value = state.subtitleStyle.background;
            if (elements.subPosSelect) elements.subPosSelect.value = state.subtitleStyle.position;
            applySubtitleStylesToDom();
        }
    } catch (e) {
        console.warn("Error loading saved settings:", e);
    }
}

// ==========================================================================
// Catalog & Discovery Loading
// ==========================================================================
async function loadGenres() {
    try {
        const resp = await fetch("/api/genres");
        if (!resp.ok) return;
        const data = await resp.json();
        state.genres = data.genres || [];

        if (elements.genreFilter) {
            elements.genreFilter.innerHTML = `<option value="">All Genres (${state.genres.length})</option>`;
            state.genres.forEach((g) => {
                const opt = document.createElement("option");
                opt.value = g.id;
                opt.textContent = g.name;
                elements.genreFilter.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Genre fetch error:", err);
    }
}

async function loadHomeFeed() {
    try {
        const resp = await fetch("/api/home");
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();

        if (data.featured) {
            state.heroItem = data.featured;
            renderHero(data.featured);
        } else if (data.trending && data.trending.length > 0) {
            state.heroItem = data.trending[0];
            renderHero(data.trending[0]);
        }

        if (data.trending && data.trending.length > 0) renderGrid(elements.trendingGrid, data.trending);
        if (data.movies && data.movies.length > 0) renderGrid(elements.moviesGrid, data.movies);
        if (data.series && data.series.length > 0) renderGrid(elements.seriesGrid, data.series);
        if (data.anime && data.anime.length > 0) renderGrid(elements.animeGrid, data.anime);
    } catch (err) {
        console.error("Home feed error:", err);
        showToast("Connecting to streaming index...", 2000);
        performSearch("Inception", null, true);
    }
}

function isItemUpcoming(item) {
    return false;
}

function renderHero(item) {
    if (!item) return;
    const title = item.title || "Featured Title";
    const overview = item.overview || "Discover high-definition streaming with dual audio and realtime Bangla & English subtitles.";
    const rating = item.rating ? `★ ${item.rating}` : "★ 8.8";
    const type = item.media_type === "tv" || item.type === "Series" ? "TV Series" : "Movie";
    const backdropUrl = item.backdrop || item.cover || "https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg";

    if (elements.heroTitle) elements.heroTitle.textContent = title;
    if (elements.heroOverview) elements.heroOverview.textContent = overview;
    if (elements.heroRating) elements.heroRating.textContent = rating;
    if (elements.heroType) {
        elements.heroType.textContent = type;
        elements.heroType.className = "badge badge-primary";
    }
    if (elements.heroWatchBtnText) {
        elements.heroWatchBtnText.textContent = "Watch Now";
    }
    if (elements.heroWatchBtn) {
        elements.heroWatchBtn.classList.remove("btn-trailer-glow");
    }

    if (elements.heroBackdrop && backdropUrl) {
        elements.heroBackdrop.style.backgroundImage = `url('${backdropUrl}')`;
    }
}

function renderGrid(container, items) {
    if (!container) return;
    container.innerHTML = "";

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">
                <p style="font-size: 16px;">No titles found matching the criteria.</p>
                <p style="font-size: 13px; margin-top: 6px;">Try adjusting filters or search keywords.</p>
            </div>
        `;
        return;
    }

    items.forEach((item) => {
        const card = createMediaCard(item);
        container.appendChild(card);
    });
}

function createMediaCard(item) {
    const card = document.createElement("div");
    card.className = "media-card";

    const title = item.title || "Unknown Title";
    const poster = item.poster || item.cover || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80";
    const rating = item.rating || item.imdb_rating || "8.0";
    const year = item.year || (item.release_date ? item.release_date.slice(0, 4) : "2024");
    const type = item.type || (item.media_type === "tv" ? "Series" : "Movie");

    card.innerHTML = `
        <div class="card-poster-wrap">
            <img class="card-poster" src="${poster}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80'">
            <div class="card-badge-top">
                <span class="badge badge-accent" style="font-size: 10px; padding: 2px 6px;">1080p</span>
            </div>
            <div class="card-badge-rating">★ ${rating}</div>
            <div class="card-play-overlay">
                <div class="card-play-icon">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>
            </div>
        </div>
        <div class="card-info">
            <div class="card-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
            <div class="card-meta">
                <span>${year}</span>
                <span class="badge badge-gold" style="font-size: 10px; padding: 2px 6px;">${type}</span>
            </div>
        </div>
    `;

    const playOverlay = card.querySelector(".card-play-overlay");
    if (playOverlay) {
        playOverlay.addEventListener("click", (e) => {
            e.stopPropagation();
            openPlayer(item);
        });
    }

    card.addEventListener("click", () => {
        openMediaDetails(item);
    });

    // Hover pre-warm stream resolution cache for instantaneous playback
    card.addEventListener("mouseenter", () => {
        if (item.subject_id) {
            fetch(`/api/streams/${item.subject_id}`).catch(() => {});
        }
    }, { once: true });

    return card;
}

// ==========================================================================
// Search Engine & Filter Engine
// ==========================================================================
function setupEventListeners() {
    // Search input live typing with debounce
    elements.searchInput.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        elements.clearSearchBtn.style.display = val ? "block" : "none";

        clearTimeout(state.searchDebounceTimer);
        if (!val) {
            elements.suggestBox.style.display = "none";
            return;
        }

        state.searchDebounceTimer = setTimeout(() => {
            fetchSuggestions(val);
        }, 200);
    });

    // Press Enter to trigger search
    elements.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const query = elements.searchInput.value.trim();
            const year = elements.searchYearSelect ? elements.searchYearSelect.value || null : null;
            if (query) {
                elements.suggestBox.style.display = "none";
                performSearch(query, year);
            }
        }
    });

    if (elements.searchYearSelect) {
        elements.searchYearSelect.addEventListener("change", () => {
            const query = elements.searchInput.value.trim();
            if (query) {
                performSearch(query, elements.searchYearSelect.value);
            }
        });
    }

    // Close suggest dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest(".search-wrapper")) {
            elements.suggestBox.style.display = "none";
        }
        if (!e.target.closest(".player-settings-panel") && !e.target.closest("#settingsBtn")) {
            elements.playerSettingsPanel.classList.remove("active");
        }
    });

    // ======================================================================
    // Custom Video Player Listeners
    // ======================================================================
    const v = elements.videoPlayer;

    // Time update & Scrubber
    v.addEventListener("timeupdate", onVideoTimeUpdate);
    v.addEventListener("progress", onVideoProgress);

    v.addEventListener("canplay", () => {
        hidePlayerLoader();
    });

    v.addEventListener("waiting", () => {
        showPlayerLoader("Buffering stream...");
    });

    v.addEventListener("playing", () => {
        hidePlayerLoader();
        updatePlayPauseIcons(true);
    });

    v.addEventListener("pause", () => {
        updatePlayPauseIcons(false);
    });

    v.addEventListener("ended", onVideoEnded);

    v.addEventListener("loadedmetadata", () => {
        // Metadata loaded successfully
    });

    v.addEventListener("error", (e) => {
        console.warn("Video stream error event:", e);
        fallbackToNextSource();
    });

    // Video container click to play/pause
    elements.videoContainer.addEventListener("click", (e) => {
        if (e.target.closest(".player-controls-overlay") || e.target.closest(".player-settings-panel")) {
            return;
        }
        togglePlay();
        flashCenterIndicator(!v.paused);
    });

    // Scrubber hover tooltip & seek
    elements.progressBarContainer.addEventListener("mousemove", onScrubberHover);
    elements.progressBarContainer.addEventListener("click", onScrubberClick);

    // Volume Slider
    elements.volumeSlider.addEventListener("input", (e) => {
        setVolume(parseFloat(e.target.value));
    });

    // Inactivity Auto-hide controls
    elements.videoContainer.addEventListener("mousemove", resetControlsTimer);
    elements.videoContainer.addEventListener("mouseleave", () => {
        if (!v.paused) {
            elements.playerControlsOverlay.classList.add("hide");
        }
    });

    // Video container double-click to toggle fullscreen
    elements.videoContainer.addEventListener("dblclick", (e) => {
        if (e.target.closest(".player-controls-overlay") || e.target.closest(".player-settings-panel")) {
            return;
        }
        toggleFullscreen();
    });

    // Cross-browser Fullscreen state listeners
    const fsEvents = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
    fsEvents.forEach((evt) => {
        document.addEventListener(evt, updateFullscreenUi);
    });

    if (elements.videoPlayer) {
        elements.videoPlayer.addEventListener("webkitbeginfullscreen", () => {
            updateFullscreenUi();
        });
        elements.videoPlayer.addEventListener("webkitendfullscreen", () => {
            updateFullscreenUi();
        });
    }

    // Keyboard Shortcuts
    document.addEventListener("keydown", handleKeyboardShortcuts);
}

async function fetchSuggestions(query) {
    try {
        const resp = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const suggestions = data.suggestions || [];

        if (suggestions.length === 0) {
            elements.suggestBox.style.display = "none";
            return;
        }

        elements.suggestBox.innerHTML = "";
        suggestions.forEach((s) => {
            const item = document.createElement("div");
            item.className = "suggest-item";
            const poster = s.cover || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=60";
            item.innerHTML = `
                <img class="suggest-poster" src="${poster}" alt="" onerror="this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&q=60'">
                <div class="suggest-info">
                    <div class="suggest-title">${escapeHtml(s.title)}</div>
                    <div class="suggest-meta">
                        <span>${s.year || "2024"}</span>
                        <span>&bull;</span>
                        <span class="badge badge-accent" style="font-size: 10px; padding: 1px 5px;">${s.type}</span>
                        ${s.rating ? `<span>★ ${s.rating}</span>` : ""}
                    </div>
                </div>
            `;
            item.addEventListener("click", () => {
                elements.suggestBox.style.display = "none";
                elements.searchInput.value = s.title;
                openMediaDetails(s);
            });
            elements.suggestBox.appendChild(item);
        });

        elements.suggestBox.style.display = "block";
    } catch (err) {
        console.error("Suggestion error:", err);
    }
}

async function performSearch(query, year = null, isSilent = false) {
    if (!query) return;
    state.activeTab = "search";
    state.catalogPage = 1;
    state.catalogHasMore = true;
    state.searchCurrentQuery = query;
    state.searchCurrentYear = year;
    state.activeFilterParams = null;

    if (!isSilent) showToast(`Searching for "${query}"...`, 1500);

    let url = `/api/search?q=${encodeURIComponent(query)}`;
    if (year) url += `&year=${year}`;

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("Search request failed");
        const data = await resp.json();
        const results = data.results || [];

        elements.searchHeader.textContent = `Search Results for "${query}" ${year ? `(${year})` : ""}`;
        elements.searchSubheader.textContent = `Found ${results.length} titles matching keyword and filters`;
        renderGrid(elements.searchResultsGrid, results);
        elements.searchSection.style.display = "block";

        if (!isSilent) {
            elements.searchSection.scrollIntoView({ behavior: "smooth" });
        }
    } catch (err) {
        console.error("Search failed:", err);
        showToast("Search failed. Try another keyword.", 3000);
    }
}

function clearSearch() {
    elements.searchInput.value = "";
    if (elements.searchYearSelect) elements.searchYearSelect.value = "";
    elements.clearSearchBtn.style.display = "none";
    elements.suggestBox.style.display = "none";
    elements.searchSection.style.display = "none";
    state.searchCurrentQuery = "";
    state.searchCurrentYear = null;
    state.activeFilterParams = null;
    state.catalogPage = 1;
    state.catalogHasMore = true;
    if (state.activeTab === "search" || state.activeTab === "filter") {
        state.activeTab = "home";
    }
}

function closeSearch() {
    clearSearch();
}

function toggleDiscoverFilters(event) {
    if (event) event.preventDefault();
    elements.filterBar.classList.toggle("active");
}

async function applyFilters() {
    const genreId = elements.genreFilter.value || null;
    const year = elements.yearFilter.value || null;
    const ratingMin = elements.ratingFilter.value || null;
    const sortBy = elements.sortByFilter.value || "popularity.desc";

    let queryParams = `media_type=movie&sort_by=${sortBy}`;
    if (genreId) queryParams += `&genre_id=${genreId}`;
    if (year) queryParams += `&year=${year}`;
    if (ratingMin) queryParams += `&rating_min=${ratingMin}`;

    state.activeTab = "filter";
    state.activeFilterParams = queryParams;
    state.catalogPage = 1;
    state.catalogHasMore = true;

    showToast("Filtering catalog...", 1500);
    try {
        const resp = await fetch(`/api/discover?${queryParams}`);
        const data = await resp.json();
        const results = data.results || [];

        const genreObj = state.genres.find((g) => String(g.id) === String(genreId));
        const genreName = genreObj ? genreObj.name : "All Genres";

        elements.searchHeader.textContent = `Filtered Catalog: ${genreName} ${year ? `(${year})` : ""}`;
        elements.searchSubheader.textContent = `${results.length} titles &bull; Min Rating: ${ratingMin ? `★ ${ratingMin}` : "Any"} &bull; Sorted by: ${sortBy.split(".")[0]}`;
        renderGrid(elements.searchResultsGrid, results);
        elements.searchSection.style.display = "block";
        elements.searchSection.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
        console.error("Filter discover error:", err);
        showToast("Error filtering catalog", 3000);
    }
}

function resetFilters() {
    elements.genreFilter.value = "";
    elements.yearFilter.value = "";
    elements.ratingFilter.value = "";
    elements.sortByFilter.value = "popularity.desc";
    elements.filterBar.classList.remove("active");
    state.activeFilterParams = null;
    state.activeTab = "home";
    state.catalogPage = 1;
    state.catalogHasMore = true;
    clearSearch();
}

function navigateTo(tab, event) {
    if (event) event.preventDefault();
    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    if (event && event.target) {
        event.target.classList.add("active");
    } else {
        const btnId = tab === "home" ? "navHome" : (tab === "movies" ? "navMovies" : (tab === "series" ? "navSeries" : "navAnime"));
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add("active");
    }

    const trendingSec = document.getElementById("trendingSection");
    const moviesSec = document.getElementById("moviesSection");
    const seriesSec = document.getElementById("seriesSection");
    const animeSec = document.getElementById("animeSection");

    clearSearch();

    state.activeTab = tab;
    state.catalogPage = 1;
    state.catalogHasMore = true;

    if (tab === "home") {
        if (trendingSec) trendingSec.style.display = "block";
        if (moviesSec) moviesSec.style.display = "block";
        if (seriesSec) seriesSec.style.display = "block";
        if (animeSec) animeSec.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (tab === "movies") {
        if (trendingSec) trendingSec.style.display = "none";
        if (moviesSec) moviesSec.style.display = "block";
        if (seriesSec) seriesSec.style.display = "none";
        if (animeSec) animeSec.style.display = "none";
        moviesSec.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "series") {
        if (trendingSec) trendingSec.style.display = "none";
        if (moviesSec) moviesSec.style.display = "none";
        if (seriesSec) seriesSec.style.display = "block";
        if (animeSec) animeSec.style.display = "none";
        seriesSec.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "anime") {
        if (trendingSec) trendingSec.style.display = "none";
        if (moviesSec) moviesSec.style.display = "none";
        if (seriesSec) seriesSec.style.display = "none";
        if (animeSec) animeSec.style.display = "block";
        animeSec.scrollIntoView({ behavior: "smooth" });
    }
}

// ==========================================================================
// Infinite Scroll & Pagination Engine (Catalog & Modal)
// ==========================================================================
function appendCardsToGrid(container, items) {
    if (!container || !items || items.length === 0) return;
    const existingTitles = new Set();
    container.querySelectorAll(".card-title").forEach((el) => {
        existingTitles.add(el.textContent.trim().toLowerCase());
    });

    items.forEach((item) => {
        const t = (item.title || "").trim().toLowerCase();
        if (!existingTitles.has(t)) {
            existingTitles.add(t);
            const card = createMediaCard(item);
            container.appendChild(card);
        }
    });
}

async function loadNextCatalogPage() {
    if (state.isCatalogLoading || !state.catalogHasMore) return;
    state.isCatalogLoading = true;

    if (elements.catalogInfiniteLoader) {
        elements.catalogInfiniteLoader.style.display = "flex";
    }

    state.catalogPage += 1;
    const nextPage = state.catalogPage;

    try {
        if (state.activeTab === "movies") {
            const resp = await fetch(`/api/discover?media_type=movie&page=${nextPage}&sort_by=popularity.desc`);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const data = await resp.json();
            const results = data.results || [];
            if (results.length === 0) {
                state.catalogHasMore = false;
            } else {
                appendCardsToGrid(elements.moviesGrid, results);
            }
        } else if (state.activeTab === "series") {
            const resp = await fetch(`/api/discover?media_type=tv&page=${nextPage}&sort_by=popularity.desc`);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const data = await resp.json();
            const results = data.results || [];
            if (results.length === 0) {
                state.catalogHasMore = false;
            } else {
                appendCardsToGrid(elements.seriesGrid, results);
            }
        } else if (state.activeTab === "anime") {
            const resp = await fetch(`/api/anime?page=${nextPage}`);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const data = await resp.json();
            const results = data.results || [];
            if (results.length === 0) {
                state.catalogHasMore = false;
            } else {
                appendCardsToGrid(elements.animeGrid, results);
            }
        } else if (state.activeTab === "filter" && state.activeFilterParams) {
            let url = `/api/discover?page=${nextPage}&${state.activeFilterParams}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const data = await resp.json();
            const results = data.results || [];
            if (results.length === 0) {
                state.catalogHasMore = false;
            } else {
                appendCardsToGrid(elements.searchResultsGrid, results);
            }
        } else if (state.activeTab === "search" && state.searchCurrentQuery) {
            let url = `/api/search?q=${encodeURIComponent(state.searchCurrentQuery)}&page=${nextPage}`;
            if (state.searchCurrentYear) url += `&year=${state.searchCurrentYear}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const data = await resp.json();
            const results = data.results || [];
            if (results.length === 0) {
                state.catalogHasMore = false;
            } else {
                appendCardsToGrid(elements.searchResultsGrid, results);
            }
        } else {
            // "home" tab — discover additional popular titles
            const resp = await fetch(`/api/discover?media_type=movie&page=${nextPage}&sort_by=popularity.desc`);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const data = await resp.json();
            const results = data.results || [];
            if (results.length === 0) {
                state.catalogHasMore = false;
            } else {
                appendCardsToGrid(elements.moviesGrid, results);
            }
        }
    } catch (err) {
        console.error("Infinite scroll catalog load error:", err);
        state.catalogHasMore = false;
    } finally {
        state.isCatalogLoading = false;
        if (elements.catalogInfiniteLoader) {
            elements.catalogInfiniteLoader.style.display = "none";
        }
    }
}

function setupCatalogInfiniteScroll() {
    // 1. IntersectionObserver on catalog sentinel
    if ("IntersectionObserver" in window && elements.catalogInfiniteSentinel) {
        const catalogObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && state.catalogHasMore && !state.isCatalogLoading) {
                    loadNextCatalogPage();
                }
            },
            {
                root: null,
                rootMargin: "300px",
            }
        );
        catalogObserver.observe(elements.catalogInfiniteSentinel);
    }

    // 2. Window scroll fallback
    let isWindowScrollThrottled = false;
    window.addEventListener(
        "scroll",
        () => {
            if (isWindowScrollThrottled) return;
            isWindowScrollThrottled = true;
            setTimeout(() => {
                isWindowScrollThrottled = false;
            }, 200);

            const scrollY = window.scrollY || window.pageYOffset;
            const totalHeight = document.documentElement.scrollHeight;
            const windowHeight = window.innerHeight;

            if (scrollY + windowHeight >= totalHeight - 400) {
                if (state.catalogHasMore && !state.isCatalogLoading) {
                    loadNextCatalogPage();
                }
            }
        },
        { passive: true }
    );
}

// ==========================================================================
// Movie Details Modal (Deep Metadata, Cast, Recommendations & Infinite Scroll)
// ==========================================================================
async function openMediaDetails(item) {
    if (!item) return;

    elements.detailModal.classList.add("active");
    document.body.style.overflow = "hidden";

    // Set initial data while fetching deep metadata
    const title = item.title || "Unknown Title";
    elements.detailTitle.textContent = title;
    elements.detailTagline.textContent = "";
    elements.detailOverview.textContent = item.overview || "Loading synopsis...";
    elements.detailRating.textContent = `★ ${item.rating || item.imdb_rating || "8.0"}`;
    elements.detailYear.textContent = item.year || (item.release_date ? item.release_date.slice(0, 4) : "2024");
    elements.detailType.textContent = item.type || (item.media_type === "tv" ? "Series" : "Movie");
    elements.detailDuration.textContent = "";
    elements.detailGenres.innerHTML = "";
    elements.detailCastGrid.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">Loading cast...</p>`;
    elements.detailRecommendationsGrid.innerHTML = "";

    const poster = item.poster || item.cover || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80";
    elements.detailPoster.src = poster;

    const backdrop = item.backdrop || item.cover || "";
    if (backdrop) {
        elements.detailHero.style.backgroundImage = `url('${backdrop}')`;
    }

    // Set initial clean watch action
    if (elements.detailWatchBtnText) {
        elements.detailWatchBtnText.textContent = "Watch Movie / Series";
    }
    if (elements.detailWatchBtn) {
        elements.detailWatchBtn.classList.remove("btn-trailer-glow");
    }

    // Initialize recommendation pagination state
    state.detailActiveTmdbId = item.tmdb_id || null;
    state.detailActiveMediaType = item.media_type || (item.type === "Series" ? "tv" : "movie");
    state.detailRecPage = 1;
    state.detailRecHasMore = true;
    state.detailRecLoading = false;

    if (elements.detailRecommendationsLoadMoreWrap) {
        elements.detailRecommendationsLoadMoreWrap.style.display = "block";
        elements.detailRecommendationsLoadMoreWrap.innerHTML = `
            <button class="btn btn-secondary" id="detailRecommendationsLoadMoreBtn" onclick="loadMoreDetailRecommendations()">
                <span>✨ See More Recommendations</span>
            </button>
            <div id="detailRecInfiniteSpinner" class="infinite-loader" style="display: none;">
                <div class="spinner-sm"></div>
                <span style="font-size: 13px; color: var(--text-muted); margin-left: 8px;">Loading more like this...</span>
            </div>
        `;
        elements.detailRecommendationsLoadMoreBtn = document.getElementById("detailRecommendationsLoadMoreBtn");
        elements.detailRecInfiniteSpinner = document.getElementById("detailRecInfiniteSpinner");
    }

    state.activeDetailItem = item;

    // Fetch deep details with TMDB cast and recommendations
    let subjectId = item.subject_id;
    let tmdbId = item.tmdb_id;

    try {
        // If subject_id is not yet present, resolve from TMDB title
        if (!subjectId) {
            try {
                const yearVal = elements.detailYear ? elements.detailYear.textContent : "";
                const bridge = await fetch(`/api/tmdb-to-moviebox?title=${encodeURIComponent(title)}&year=${yearVal}&tmdb_id=${tmdbId || ""}`);
                if (bridge.ok) {
                    const bridgeData = await bridge.json();
                    if (bridgeData && bridgeData.subject_id) {
                        subjectId = bridgeData.subject_id;
                        state.activeDetailItem.subject_id = subjectId;
                    }
                }
            } catch (err) {
                console.warn("Detail bridge match warning:", err);
            }
        }

        if (subjectId) {
            const detResp = await fetch(`/api/detail/${subjectId}?tmdb_id=${tmdbId || ""}`);
            const details = await detResp.json();

            if (details.tagline) elements.detailTagline.textContent = `"${details.tagline}"`;
            if (details.duration || details.runtime) elements.detailDuration.textContent = details.duration || details.runtime;
            if (details.description) elements.detailOverview.textContent = details.description;

            // Genres
            if (details.genres && details.genres.length > 0) {
                elements.detailGenres.innerHTML = details.genres.map((g) => `<span class="genre-tag">${escapeHtml(g)}</span>`).join("");
            } else if (details.genre) {
                elements.detailGenres.innerHTML = details.genre.split(",").map((g) => `<span class="genre-tag">${escapeHtml(g.trim())}</span>`).join("");
            }

            // Render Cast
            renderCast(details.cast || []);

            // Set verified TMDB ID & Media Type for recommendations pagination
            if (details.tmdb_id) state.detailActiveTmdbId = details.tmdb_id;
            if (details.media_type) state.detailActiveMediaType = details.media_type;

            // Render Initial Recommendations
            const initialRecs = details.recommendations || [];
            renderGrid(elements.detailRecommendationsGrid, initialRecs);

            if (initialRecs.length === 0) {
                state.detailRecHasMore = false;
                if (elements.detailRecommendationsLoadMoreWrap) {
                    elements.detailRecommendationsLoadMoreWrap.style.display = "none";
                }
            } else {
                if (elements.detailRecommendationsLoadMoreWrap) {
                    elements.detailRecommendationsLoadMoreWrap.style.display = "block";
                }
            }

            if (elements.detailWatchBtnText) elements.detailWatchBtnText.textContent = "Watch Movie / Series";
            if (elements.detailWatchBtn) elements.detailWatchBtn.classList.remove("btn-trailer-glow");
        }
    } catch (err) {
        console.error("Detail enrich error:", err);
    }
}

async function loadMoreDetailRecommendations() {
    if (!state.detailActiveTmdbId) return;
    if (state.detailRecLoading || !state.detailRecHasMore) return;

    state.detailRecLoading = true;
    if (elements.detailRecInfiniteSpinner) {
        elements.detailRecInfiniteSpinner.style.display = "inline-flex";
    }
    if (elements.detailRecommendationsLoadMoreBtn) {
        elements.detailRecommendationsLoadMoreBtn.style.display = "none";
    }

    state.detailRecPage += 1;
    const url = `/api/recommendations/${state.detailActiveTmdbId}?media_type=${encodeURIComponent(state.detailActiveMediaType || "movie")}&page=${state.detailRecPage}`;

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const data = await resp.json();
        const results = data.results || [];

        if (results.length === 0) {
            state.detailRecHasMore = false;
            if (elements.detailRecommendationsLoadMoreWrap) {
                elements.detailRecommendationsLoadMoreWrap.innerHTML = `
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 10px;">
                        ✓ You've viewed all recommended titles.
                    </p>
                `;
            }
        } else {
            // Append recommendations without duplicates
            const existingTitles = new Set();
            elements.detailRecommendationsGrid.querySelectorAll(".card-title").forEach((el) => {
                existingTitles.add(el.textContent.trim().toLowerCase());
            });

            let addedCount = 0;
            results.forEach((rec) => {
                const recTitle = (rec.title || "").trim().toLowerCase();
                if (!existingTitles.has(recTitle)) {
                    existingTitles.add(recTitle);
                    const card = createMediaCard(rec);
                    elements.detailRecommendationsGrid.appendChild(card);
                    addedCount++;
                }
            });

            if (results.length < 5 || addedCount === 0) {
                state.detailRecHasMore = false;
                if (elements.detailRecommendationsLoadMoreWrap) {
                    elements.detailRecommendationsLoadMoreWrap.innerHTML = `
                        <p style="font-size: 13px; color: var(--text-muted); margin-top: 10px;">
                            ✓ All related titles loaded.
                        </p>
                    `;
                }
            } else {
                if (elements.detailRecommendationsLoadMoreBtn) {
                    elements.detailRecommendationsLoadMoreBtn.style.display = "inline-flex";
                    elements.detailRecommendationsLoadMoreBtn.innerHTML = "<span>✨ See More Recommendations</span>";
                }
            }
        }
    } catch (err) {
        console.error("Failed to load more recommendations:", err);
        state.detailRecHasMore = false;
        if (elements.detailRecommendationsLoadMoreWrap) {
            elements.detailRecommendationsLoadMoreWrap.innerHTML = `
                <p style="font-size: 13px; color: var(--text-muted); margin-top: 10px;">
                    All available recommendations displayed.
                </p>
            `;
        }
    } finally {
        state.detailRecLoading = false;
        if (elements.detailRecInfiniteSpinner) {
            elements.detailRecInfiniteSpinner.style.display = "none";
        }
    }
}

function setupModalInfiniteScroll() {
    const dialog = document.querySelector(".detail-dialog");
    if (!dialog) return;

    let isModalScrollThrottled = false;
    dialog.addEventListener(
        "scroll",
        () => {
            if (isModalScrollThrottled) return;
            isModalScrollThrottled = true;
            setTimeout(() => {
                isModalScrollThrottled = false;
            }, 150);

            // Trigger when scrolled near bottom of dialog
            if (dialog.scrollTop + dialog.clientHeight >= dialog.scrollHeight - 300) {
                if (state.detailRecHasMore && !state.detailRecLoading && state.detailActiveTmdbId) {
                    loadMoreDetailRecommendations();
                }
            }
        },
        { passive: true }
    );

    // Also support IntersectionObserver on detailRecSentinel if supported
    if ("IntersectionObserver" in window && elements.detailRecSentinel) {
        const modalObserver = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && state.detailRecHasMore && !state.detailRecLoading && state.detailActiveTmdbId) {
                    loadMoreDetailRecommendations();
                }
            },
            {
                root: dialog,
                rootMargin: "250px",
            }
        );
        modalObserver.observe(elements.detailRecSentinel);
    }
}

// Expose globally for inline button onclick attributes
window.loadMoreDetailRecommendations = loadMoreDetailRecommendations;

function renderCast(castList) {
    if (!castList || castList.length === 0) {
        elements.detailCastGrid.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">Cast information currently unavailable.</p>`;
        return;
    }

    elements.detailCastGrid.innerHTML = "";
    castList.slice(0, 8).forEach((actor) => {
        const card = document.createElement("div");
        card.className = "cast-card";
        const photo = actor.profile_img || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=70";
        card.innerHTML = `
            <img src="${photo}" alt="${escapeHtml(actor.name)}" class="cast-photo" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=70'">
            <div class="cast-name" title="${escapeHtml(actor.name)}">${escapeHtml(actor.name)}</div>
            <div class="cast-character" title="${escapeHtml(actor.character)}">${escapeHtml(actor.character || "Cast")}</div>
        `;
        elements.detailCastGrid.appendChild(card);
    });
}

function closeDetailModal() {
    elements.detailModal.classList.remove("active");
    document.body.style.overflow = "";
}

function watchFromDetails() {
    if (!state.activeDetailItem) return;
    closeDetailModal();
    openPlayer(state.activeDetailItem);
}

function playHero() {
    if (!state.heroItem) return;
    openPlayer(state.heroItem);
}

function openHeroDetails() {
    if (state.heroItem) {
        openMediaDetails(state.heroItem);
    }
}

// ==========================================================================
// Advanced Media Player & Official Stream Orchestrator
// ==========================================================================
async function openPlayer(item) {
    if (!item) return;
    state.currentMediaItem = item;

    let subjectId = item.subject_id;
    let title = item.title;

    // Resolve subject_id if starting from TMDB item
    if (!subjectId) {
        showPlayerLoader(`Connecting to streaming catalog for "${title}"...`);
        openPlayerModal(title);

        const yearParam = item.year || (item.release_date ? item.release_date.slice(0, 4) : "");

        try {
            const bridge = await fetch(`/api/tmdb-to-moviebox?title=${encodeURIComponent(title)}&year=${yearParam}`);
            if (bridge.ok) {
                const bData = await bridge.json();
                if (bData && bData.subject_id) {
                    subjectId = bData.subject_id;
                }
            }
        } catch (e) {
            console.warn("Bridge lookup failed, falling back to direct search:", e);
        }

        // Direct search fallback
        if (!subjectId) {
            try {
                const sResp = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
                if (sResp.ok) {
                    const sData = await sResp.json();
                    const matched = sData && sData.results && sData.results.length > 0 ? sData.results[0] : null;
                    if (matched && matched.subject_id) {
                        subjectId = matched.subject_id;
                    }
                }
            } catch (e) {
                console.warn("Search fallback error:", e);
            }
        }

        if (!subjectId) {
            hidePlayerLoader();
            elements.playerModal.classList.remove("active");
            document.body.style.overflow = "";
            showToast(`Stream source is preparing "${title}". Please choose another title from Home or Search!`, 3500);
            return;
        }
    } else {
        openPlayerModal(title);
    }

    state.currentSubjectId = subjectId;
    state.currentTitle = title;
    state.currentSeason = 1;
    state.currentEpisode = 1;

    await loadMediaForPlayer(subjectId);
}

function openPlayerModal(title) {
    elements.playerTitle.textContent = title || "Now Playing";
    elements.playerModal.classList.add("active");
    document.body.style.overflow = "hidden";
    showPlayerLoader("Resolving high-speed 1080p stream...");
    resetControlsTimer();
}

function closePlayer() {
    const v = elements.videoPlayer;
    v.pause();
    v.removeAttribute("src");
    v.load();
    elements.playerModal.classList.remove("active");
    elements.playerSettingsPanel.classList.remove("active");
    document.body.style.overflow = "";
    hidePlayerLoader();
}

async function loadMediaForPlayer(subjectId) {
    showPlayerLoader("Connecting to high-speed stream...");

    try {
        const curSeason = state.isSeries ? state.currentSeason : 0;
        const curEp = state.isSeries ? state.currentEpisode : 0;

        // 1. PRIORITY #1: Load stream sources & captions IMMEDIATELY in parallel!
        const streamPromise = loadStreamsAndCaptions(subjectId, curSeason, curEp);

        // 2. Load series episodes, metadata, and audio tracks concurrently in background without blocking video
        const detailPromise = fetch(`/api/detail/${subjectId}`)
            .then((r) => r.json())
            .then((details) => {
                state.isSeries = details.subject_type === 2 || details.type === "Series";
                if (state.isSeries) {
                    elements.seriesControls.style.display = "block";
                    elements.playerEpisodeTag.style.display = "inline-block";
                    elements.prevEpPlayerBtn.style.display = "flex";
                    elements.nextEpPlayerBtn.style.display = "flex";
                    state.seasonsData = details.seasons || [];
                    renderSeasonTabs(state.seasonsData);
                } else {
                    elements.seriesControls.style.display = "none";
                    elements.playerEpisodeTag.style.display = "none";
                    elements.prevEpPlayerBtn.style.display = "none";
                    elements.nextEpPlayerBtn.style.display = "none";
                }
                loadAudioTracks(subjectId, curSeason, curEp);
            })
            .catch((err) => console.warn("Background detail load warning:", err));

        await streamPromise;
    } catch (err) {
        console.error("Player media load failed:", err);
        showToast("Error loading stream: " + err.message, 4000);
        hidePlayerLoader();
    }
}

// ==========================================================================
// Streaming Sources & Smart Adaptive Video Quality Manager
// ==========================================================================

// Intelligent Network & Device Adaptive Quality Selector
function selectAdaptiveStream(streams) {
    if (!streams || streams.length === 0) return null;

    // Check Network Information API
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isSaveData = conn && conn.saveData;
    const effectiveType = conn && conn.effectiveType ? conn.effectiveType : "4g"; // '4g', '3g', '2g', 'slow-2g'
    const downlink = conn && conn.downlink ? conn.downlink : 10; // in Mbps

    // Determine target quality based on network speed & device capabilities:
    // Notice: 4K (2160p) streams are 6-15 GB and require 35+ Mbps uninterrupted bitrate
    // and powerful hardware decoders. 1080p is the golden standard for instant bufferless play.
    let targetQuality = 1080;

    if (isSaveData || effectiveType === "2g" || effectiveType === "slow-2g" || downlink < 1.5) {
        targetQuality = 480; // Slow / Data-saver mode
    } else if (effectiveType === "3g" || downlink < 4 || (isMobile && downlink < 8)) {
        targetQuality = 720; // 3G or moderate mobile data
    } else if (isMobile) {
        targetQuality = 1080; // Mobile devices: 1080p gives maximum sharpness without 4K overheating
    } else if (!isMobile && downlink >= 35 && window.innerWidth >= 2560) {
        // High-end desktop on ultra-fast broadband and 2K/4K monitor
        targetQuality = 2160;
    } else {
        targetQuality = 1080; // Standard fast broadband desktop default
    }

    // Try finding stream matching targetQuality or highest quality <= targetQuality
    const suitable = streams.filter(s => (s.quality_value || 0) <= targetQuality);
    if (suitable.length > 0) {
        suitable.sort((a, b) => (b.quality_value || 0) - (a.quality_value || 0));
        return suitable[0];
    }

    // If all available streams exceed targetQuality (e.g. only 4K available), pick lowest available so it plays easiest
    const sortedAsc = [...streams].sort((a, b) => (a.quality_value || 0) - (b.quality_value || 0));
    return sortedAsc[0] || streams[0];
}

let videoStallTimeout = null;

async function loadStreamsAndCaptions(subjectId, season = 0, episode = 0, resumeTime = 0, autoPlay = true) {
    showPlayerLoader("Resolving high-speed buffer-free stream...");

    try {
        const [streamsResp, captionsResp] = await Promise.all([
            fetch(`/api/streams/${subjectId}?se=${season}&ep=${episode}`),
            fetch(`/api/captions/${subjectId}?se=${season}&ep=${episode}`),
        ]);

        const streamData = await streamsResp.json();
        const captionData = await captionsResp.json();

        state.availableStreams = streamData.streams || [];
        state.availableCaptions = captionData.captions || [];

        if (state.availableStreams.length === 0) {
            hidePlayerLoader();
            elements.playerModal.classList.remove("active");
            document.body.style.overflow = "";
            showToast(`"${state.currentTitle || 'This movie'}" is not yet released on digital streaming/OTT. Please choose any released movie from Home or Search!`, 4500);
            return;
        }

        // Auto-select optimal stream based on user network and device
        state.isAutoQuality = true;
        const optimalStream = selectAdaptiveStream(state.availableStreams);
        state.currentStream = optimalStream;

        // Populate Settings Panel Options
        renderQualityOptions(state.availableStreams);
        renderSourceOptions(state.availableStreams);
        renderSubtitleOptions(state.availableCaptions);

        // Apply stream to custom player via HTTP 206 Proxy
        applyVideoStream(optimalStream, resumeTime, autoPlay);
    } catch (err) {
        console.error("Streams fetch error:", err);
        showToast("Stream loading error: " + err.message, 4000);
        hidePlayerLoader();
    }
}

function applyVideoStream(stream, resumeTime = 0, autoPlay = true) {
    if (videoStallTimeout) {
        clearTimeout(videoStallTimeout);
        videoStallTimeout = null;
    }

    showPlayerLoader(`Starting ${stream.quality} (${stream.source_name ? stream.source_name.split("(")[0].trim() : "Stream"})...`);

    const streamUrl = stream.proxy_url || stream.url;
    elements.videoPlayer.src = streamUrl;
    elements.playerQualityTag.textContent = stream.quality;
    elements.playerSourceTag.textContent = stream.source_name ? stream.source_name.split("(")[0].trim() : "Source 1";

    elements.videoPlayer.preload = "auto";
    elements.videoPlayer.playbackRate = state.playbackSpeed;
    elements.videoPlayer.volume = state.volume;
    elements.videoPlayer.muted = state.isMuted;
    elements.videoPlayer.load();

    let started = false;
    const triggerInstantPlay = () => {
        if (started) return;
        started = true;
        if (videoStallTimeout) {
            clearTimeout(videoStallTimeout);
            videoStallTimeout = null;
        }
        hidePlayerLoader();
        if (resumeTime > 0) {
            try { elements.videoPlayer.currentTime = resumeTime; } catch (e) {}
        }
        if (autoPlay) {
            elements.videoPlayer.play().catch((e) => {
                console.warn("Autoplay was prevented by browser:", e);
                updatePlayPauseIcons(false);
            });
        }
    };

    // Auto-fallback ONLY when in Auto mode; if user manually selected quality, respect user's choice!
    elements.videoPlayer.onerror = (e) => {
        console.warn(`Stream playback error on ${stream.quality}`, e);
        if (videoStallTimeout) {
            clearTimeout(videoStallTimeout);
            videoStallTimeout = null;
        }
        if (state.isAutoQuality !== false) {
            fallbackToNextSource();
        } else {
            hidePlayerLoader();
            showToast(`Cannot play ${stream.quality}. Please select another quality or Auto.`, 3500);
        }
    };

    // Safety timeout ONLY in Auto mode: If stream stalls for > 8 seconds without playing, auto fallback
    if (state.isAutoQuality !== false) {
        videoStallTimeout = setTimeout(() => {
            if (!started && elements.playerModal.classList.contains("active") && state.isAutoQuality !== false) {
                console.warn(`Playback initial buffer stalled for ${stream.quality}, auto-falling back...`);
                fallbackToNextSource();
            }
        }, 8000);
    }

    // Start playing as soon as initial video buffer is ready
    elements.videoPlayer.oncanplay = triggerInstantPlay;
    elements.videoPlayer.onloadeddata = triggerInstantPlay;
    elements.videoPlayer.onplaying = triggerInstantPlay;
    elements.videoPlayer.onloadedmetadata = () => {
        if (!started) triggerInstantPlay();
    };
}

function renderQualityOptions(streams) {
    elements.qualityOptionsList.innerHTML = "";

    const isAutoActive = state.isAutoQuality !== false;

    // Add Auto option (shows current auto-adaptive resolution)
    const autoBtn = document.createElement("button");
    autoBtn.className = "option-btn" + (isAutoActive ? " active" : "");
    autoBtn.innerHTML = `<span>Auto (${state.currentStream ? state.currentStream.quality : "Adaptive"})</span>${isAutoActive ? "<span>✓</span>" : ""}`;
    autoBtn.addEventListener("click", () => {
        state.isAutoQuality = true;
        const optimal = selectAdaptiveStream(streams);
        switchQuality(optimal, true);
    });
    elements.qualityOptionsList.appendChild(autoBtn);

    // List all distinct available qualities sorted descending
    const uniqueQualities = [];
    const seen = new Set();
    streams.forEach((s) => {
        if (!seen.has(s.quality)) {
            seen.add(s.quality);
            uniqueQualities.push(s);
        }
    });

    uniqueQualities.forEach((s) => {
        const btn = document.createElement("button");
        const isActive = !isAutoActive && state.currentStream && state.currentStream.quality === s.quality;
        btn.className = "option-btn" + (isActive ? " active" : "");
        btn.innerHTML = `<span>${s.quality} (${s.format})</span>${isActive ? "<span>✓</span>" : ""}`;
        btn.addEventListener("click", () => {
            state.isAutoQuality = false;
            switchQuality(s, false);
        });
        elements.qualityOptionsList.appendChild(btn);
    });
}

function switchQuality(stream, isAuto = false) {
    if (stream === state.currentStream && isAuto === state.isAutoQuality) return;
    const currentTime = elements.videoPlayer.currentTime || 0;
    const wasPlaying = !elements.videoPlayer.paused;

    state.currentStream = stream;
    state.isAutoQuality = isAuto;
    renderQualityOptions(state.availableStreams);
    renderSourceOptions(state.availableStreams);
    showToast(isAuto ? `Quality: Auto (${stream.quality})` : `Video Quality: ${stream.quality}`, 1800);

    applyVideoStream(stream, currentTime, wasPlaying);
}

function renderSourceOptions(streams) {
    elements.sourceOptionsList.innerHTML = "";

    streams.forEach((s, idx) => {
        const btn = document.createElement("button");
        const isActive = s === state.currentStream;
        btn.className = "option-btn" + (isActive ? " active" : "");
        btn.innerHTML = `<span>${s.source_name || `Source ${idx + 1}`} (${s.quality})</span>${isActive ? "<span>✓</span>" : ""}`;
        btn.addEventListener("click", () => {
            if (s === state.currentStream) return;
            const currentTime = elements.videoPlayer.currentTime || 0;
            const wasPlaying = !elements.videoPlayer.paused;
            state.currentStream = s;
            state.isAutoQuality = false;
            renderQualityOptions(state.availableStreams);
            renderSourceOptions(state.availableStreams);
            showToast(`Switched to ${s.source_name || `Source ${idx + 1}`}`, 2000);
            applyVideoStream(s, currentTime, wasPlaying);
        });
        elements.sourceOptionsList.appendChild(btn);
    });
}

function fallbackToNextSource() {
    // If the user manually chose a quality, strictly respect their choice! Never auto-switch.
    if (state.isAutoQuality === false) {
        console.log("Manual quality locked by user. Auto fallback disabled.");
        return;
    }
    if (!state.availableStreams || state.availableStreams.length <= 1) return;
    
    // Sort available streams by quality value descending to find the next lower resolution
    const sortedStreams = [...state.availableStreams].sort((a, b) => (b.quality_value || 0) - (a.quality_value || 0));
    const currentVal = state.currentStream ? (state.currentStream.quality_value || 0) : 9999;
    
    // Find next stream with lower quality value, or next index
    let nextStream = sortedStreams.find(s => (s.quality_value || 0) < currentVal);
    if (!nextStream) {
        const currentIndex = state.availableStreams.indexOf(state.currentStream);
        if (currentIndex >= 0 && currentIndex < state.availableStreams.length - 1) {
            nextStream = state.availableStreams[currentIndex + 1];
        }
    }

    if (nextStream && nextStream !== state.currentStream) {
        console.log(`Smart Fallback: switching from ${state.currentStream ? state.currentStream.quality : "?"} to ${nextStream.quality}`);
        showToast(`Network speed adjusting: playing in ${nextStream.quality}...`, 2500);
        const currentTime = elements.videoPlayer.currentTime || 0;
        state.currentStream = nextStream;
        renderQualityOptions(state.availableStreams);
        renderSourceOptions(state.availableStreams);
        applyVideoStream(nextStream, currentTime, true);
    }
}

// ==========================================================================
// Dual / Multi-Audio System
// ==========================================================================
async function loadAudioTracks(subjectId, season = 0, episode = 0) {
    try {
        const resp = await fetch(`/api/audio-options/${subjectId}?se=${season}&ep=${episode}`);
        if (!resp.ok) return;
        const data = await resp.json();

        state.availableAudios = data.audio_tracks || [];
        state.currentAudioId = subjectId;

        renderAudioOptions(state.availableAudios);
    } catch (err) {
        console.error("Audio options error:", err);
    }
}

function renderAudioOptions(audioTracks) {
    elements.audioOptionsList.innerHTML = "";

    if (!audioTracks || audioTracks.length === 0) {
        elements.audioOptionsList.innerHTML = `<button class="option-btn active"><span>Original Audio</span><span>✓</span></button>`;
        return;
    }

    audioTracks.forEach((track) => {
        const btn = document.createElement("button");
        const isActive = track.subject_id === state.currentAudioId;
        btn.className = "option-btn" + (isActive ? " active" : "");

        let flag = "🌐";
        if (track.lang_code === "hi") flag = "🇮🇳";
        if (track.lang_code === "en") flag = "🇺🇸";

        btn.innerHTML = `<span>${flag} ${escapeHtml(track.label)}</span>${isActive ? "<span>✓</span>" : ""}`;
        btn.addEventListener("click", () => {
            switchAudioTrack(track);
        });
        elements.audioOptionsList.appendChild(btn);
    });

    const activeTrack = audioTracks.find((t) => t.subject_id === state.currentAudioId) || audioTracks[0];
    if (activeTrack) {
        elements.playerAudioTag.textContent = activeTrack.label;
    }
}

async function switchAudioTrack(track) {
    if (track.subject_id === state.currentAudioId) return;

    showToast(`Switching to ${track.label}...`, 2000);
    showPlayerLoader(`Connecting to ${track.label} stream...`);

    const savedTime = elements.videoPlayer.currentTime || 0;
    const wasPlaying = !elements.videoPlayer.paused;

    state.currentAudioId = track.subject_id;
    renderAudioOptions(state.availableAudios);

    // Fetch stream for this audio version preserving timestamp
    await loadStreamsAndCaptions(
        track.subject_id,
        state.isSeries ? state.currentSeason : 0,
        state.isSeries ? state.currentEpisode : 0,
        savedTime,
        wasPlaying
    );
}

// ==========================================================================
// Subtitles Engine (Guaranteed Realtime Bangla, English & Multi-Lang)
// ==========================================================================
function renderSubtitleOptions(captions) {
    elements.subtitleOptionsList.innerHTML = "";

    // Option 1: Off
    const offBtn = document.createElement("button");
    const isOff = !state.activeSubtitleCode || state.activeSubtitleCode === "off";
    offBtn.className = "option-btn" + (isOff ? " active" : "");
    offBtn.innerHTML = `<span>Subtitles Off</span>${isOff ? "<span>✓</span>" : ""}`;
    offBtn.addEventListener("click", () => setSubtitle("off"));
    elements.subtitleOptionsList.appendChild(offBtn);

    // List clean, prioritized subtitles (Bangla #1, English #2)
    captions.forEach((cap) => {
        const btn = document.createElement("button");
        const isActive = state.activeSubtitleCode === cap.code;
        btn.className = "option-btn" + (isActive ? " active" : "");

        let badge = "💬";
        if (cap.is_bangla || cap.code === "bn") badge = "🇧🇩";
        else if (cap.is_english || cap.code === "en") badge = "🇬🇧";
        else if (cap.code === "hi") badge = "🇮🇳";

        btn.innerHTML = `<span>${badge} ${escapeHtml(cap.language)}</span>${isActive ? "<span>✓</span>" : ""}`;
        btn.addEventListener("click", () => {
            setSubtitleTrack(cap.vtt_url, cap.language, cap.code);
        });
        elements.subtitleOptionsList.appendChild(btn);
    });

    // If user previously turned subtitles on (preference), maintain Bangla subtitle
    if (state.subtitleUserWantsOn && state.activeSubtitleCode === "off") {
        const banglaCap = captions.find((c) => c.is_bangla || c.code === "bn");
        if (banglaCap) {
            setSubtitleTrack(banglaCap.vtt_url, "বাংলা (Bangla)", "bn");
        }
    }
}

function setSubtitleTrack(vttUrl, label, code) {
    clearSubtitles();

    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = label;
    track.srclang = code;
    track.src = vttUrl;
    track.default = true;

    elements.videoPlayer.appendChild(track);
    state.activeSubtitleCode = code;
    state.subtitleUserWantsOn = true;

    elements.playerSubTag.textContent = `${label} ON`;
    elements.ccToggleBtn.classList.add("active");
    showToast(`Subtitles: ${label}`, 2000);

    renderSubtitleOptions(state.availableCaptions);

    setTimeout(() => {
        for (let i = 0; i < elements.videoPlayer.textTracks.length; i++) {
            elements.videoPlayer.textTracks[i].mode = "showing";
        }
    }, 100);
}

function setSubtitle(mode) {
    if (mode === "off") {
        clearSubtitles();
        state.activeSubtitleCode = "off";
        state.subtitleUserWantsOn = false;
        elements.playerSubTag.textContent = "Subtitles Off";
        elements.ccToggleBtn.classList.remove("active");
        renderSubtitleOptions(state.availableCaptions);
        showToast("Subtitles turned off", 1500);
    }
}

function toggleSubtitlesQuick() {
    if (state.activeSubtitleCode && state.activeSubtitleCode !== "off") {
        setSubtitle("off");
    } else {
        // When turning subtitles ON, ALWAYS activate Bangla (বাংলা)!
        const banglaCap = state.availableCaptions.find((c) => c.is_bangla || c.code === "bn");
        const englishCap = state.availableCaptions.find((c) => c.is_english || c.code === "en");

        if (banglaCap) {
            setSubtitleTrack(banglaCap.vtt_url, "বাংলা (Bangla)", "bn");
        } else if (englishCap) {
            setSubtitleTrack(englishCap.vtt_url, "English", "en");
        } else if (state.availableCaptions.length > 0) {
            const first = state.availableCaptions[0];
            setSubtitleTrack(first.vtt_url, first.language, first.code);
        } else {
            showToast("No subtitle tracks available for this stream", 2000);
        }
    }
}

function clearSubtitles() {
    const tracks = elements.videoPlayer.querySelectorAll("track");
    tracks.forEach((t) => t.remove());
    for (let i = 0; i < elements.videoPlayer.textTracks.length; i++) {
        elements.videoPlayer.textTracks[i].mode = "disabled";
    }
}

function handleCustomSubtitle(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        let content = e.target.result;
        if (file.name.endsWith(".srt") || !content.startsWith("WEBVTT")) {
            content = "WEBVTT\n\n" + content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
        }

        const blob = new Blob([content], { type: "text/vtt;charset=utf-8" });
        const blobUrl = URL.createObjectURL(blob);

        setSubtitleTrack(blobUrl, `Custom (${file.name})`, "custom");
        showToast(`Loaded subtitle: ${file.name}`, 3000);
    };
    reader.readAsText(file);
}

// Subtitle Styling Customizer
function updateSubtitleStyles() {
    state.subtitleStyle = {
        fontSize: elements.subFontSizeSelect.value,
        color: elements.subColorSelect.value,
        background: elements.subBgSelect.value,
        position: elements.subPosSelect.value,
    };
    localStorage.setItem("mbox_subtitle_style", JSON.stringify(state.subtitleStyle));
    applySubtitleStylesToDom();
    showToast("Subtitle styles updated", 1500);
}

function applySubtitleStylesToDom() {
    const s = state.subtitleStyle;
    let styleEl = document.getElementById("dynamic-cue-style");
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "dynamic-cue-style";
        document.head.appendChild(styleEl);
    }

    styleEl.innerHTML = `
        ::cue {
            font-size: ${s.fontSize} !important;
            color: ${s.color} !important;
            background-color: ${s.background} !important;
            ${s.position === "top" ? "line: 5% !important;" : "line: 90% !important;"}
            font-weight: 600 !important;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9) !important;
        }
    `;

    elements.customSubtitleLayer.classList.toggle("pos-top", s.position === "top");
}

// ==========================================================================
// Video Controls & Custom Scrubber Interactions
// ==========================================================================
function togglePlay() {
    const v = elements.videoPlayer;
    if (v.paused) {
        v.play().catch(() => {});
    } else {
        v.pause();
    }
}

function updatePlayPauseIcons(isPlaying) {
    elements.playIcon.style.display = isPlaying ? "none" : "block";
    elements.pauseIcon.style.display = isPlaying ? "block" : "none";
}

function flashCenterIndicator(isPlaying) {
    const icon = elements.centerPlayIcon;
    icon.innerHTML = isPlaying
        ? `<path d="M8 5v14l11-7z"/>`
        : `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;

    elements.centerPlayIndicator.classList.remove("flash");
    void elements.centerPlayIndicator.offsetWidth; // force reflow
    elements.centerPlayIndicator.classList.add("flash");
}

function skipTime(seconds) {
    const v = elements.videoPlayer;
    v.currentTime = Math.max(0, Math.min(v.duration || 99999, v.currentTime + seconds));
    showToast(seconds > 0 ? `⏩ +${seconds}s` : `⏪ ${seconds}s`, 1000);
}

function onVideoTimeUpdate() {
    const v = elements.videoPlayer;
    if (!v.duration || state.isUserScrubbing) return;

    const percent = (v.currentTime / v.duration) * 100;
    elements.progressPlayed.style.width = `${percent}%`;
    elements.progressThumb.style.left = `${percent}%`;

    elements.currentTimeDisplay.textContent = formatTime(v.currentTime);
    elements.durationDisplay.textContent = formatTime(v.duration);
}

function onVideoProgress() {
    const v = elements.videoPlayer;
    if (!v.duration || v.buffered.length === 0) return;

    try {
        const bufferedEnd = v.buffered.end(v.buffered.length - 1);
        const percent = (bufferedEnd / v.duration) * 100;
        elements.progressBuffered.style.width = `${percent}%`;
    } catch (e) {}
}

function onScrubberClick(e) {
    const rect = elements.progressTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const v = elements.videoPlayer;
    if (v.duration) {
        v.currentTime = percent * v.duration;
    }
}

function onScrubberHover(e) {
    const rect = elements.progressTrack.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, hoverX / rect.width));
    const v = elements.videoPlayer;

    if (v.duration) {
        const previewTime = percent * v.duration;
        elements.timeTooltip.textContent = formatTime(previewTime);
        elements.timeTooltip.style.left = `${hoverX}px`;
    }
}

function setVolume(val) {
    state.volume = val;
    elements.videoPlayer.volume = val;
    state.isMuted = val === 0;
    elements.videoPlayer.muted = state.isMuted;
    elements.volumeSlider.value = val;
    elements.volumeHighIcon.style.display = state.isMuted ? "none" : "block";
    elements.volumeMutedIcon.style.display = state.isMuted ? "block" : "none";
}

function toggleMute() {
    if (elements.videoPlayer.muted) {
        elements.videoPlayer.muted = false;
        state.isMuted = false;
        elements.videoPlayer.volume = state.volume > 0 ? state.volume : 0.5;
        elements.volumeSlider.value = elements.videoPlayer.volume;
        elements.volumeHighIcon.style.display = "block";
        elements.volumeMutedIcon.style.display = "none";
        showToast("🔊 Unmuted", 1000);
    } else {
        elements.videoPlayer.muted = true;
        state.isMuted = true;
        elements.volumeHighIcon.style.display = "none";
        elements.volumeMutedIcon.style.display = "block";
        showToast("🔇 Muted", 1000);
    }
}

function setPlaybackSpeed(speed) {
    state.playbackSpeed = speed;
    elements.videoPlayer.playbackRate = speed;
    document.querySelectorAll("#sec-speed .option-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.textContent.startsWith(String(speed)));
    });
    showToast(`Playback Speed: ${speed}x`, 1500);
}

function togglePiP() {
    if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
    } else if (document.pictureInPictureEnabled) {
        elements.videoPlayer.requestPictureInPicture().catch((err) => {
            showToast("Picture-in-Picture not supported: " + err.message, 2000);
        });
    }
}

function getFullscreenElement() {
    return (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        (elements.videoContainer && elements.videoContainer.classList.contains("is-fullscreen") ? elements.videoContainer : null)
    );
}

function updateFullscreenUi() {
    const isFs = !!getFullscreenElement();
    if (elements.enterFullscreenIcon) {
        elements.enterFullscreenIcon.style.display = isFs ? "none" : "block";
    }
    if (elements.exitFullscreenIcon) {
        elements.exitFullscreenIcon.style.display = isFs ? "block" : "none";
    }
    if (elements.videoContainer) {
        elements.videoContainer.classList.toggle("is-fullscreen", isFs);
    }
}

async function toggleFullscreen() {
    const target = elements.videoContainer || elements.playerModal;
    const isCurrentlyFs = !!getFullscreenElement();

    if (!isCurrentlyFs) {
        try {
            if (target && target.requestFullscreen) {
                await target.requestFullscreen();
            } else if (target && target.webkitRequestFullscreen) {
                await target.webkitRequestFullscreen();
            } else if (target && target.webkitRequestFullScreen) {
                await target.webkitRequestFullScreen();
            } else if (target && target.mozRequestFullScreen) {
                await target.mozRequestFullScreen();
            } else if (target && target.msRequestFullscreen) {
                await target.msRequestFullscreen();
            } else if (elements.videoPlayer && elements.videoPlayer.webkitEnterFullscreen) {
                elements.videoPlayer.webkitEnterFullscreen();
                return;
            } else {
                if (target) target.classList.add("is-fullscreen");
            }
        } catch (err) {
            console.warn("Fullscreen request error, applying viewport cinema fallback:", err);
            if (target) target.classList.toggle("is-fullscreen");
        }
    } else {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                await document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
        } catch (err) {
            console.warn("Exit fullscreen error:", err);
        }
        if (target) {
            target.classList.remove("is-fullscreen");
        }
    }
    updateFullscreenUi();
}

window.toggleFullscreen = toggleFullscreen;

function toggleSettingsPanel() {
    elements.playerSettingsPanel.classList.toggle("active");
}

function switchSettingsTab(tabName) {
    document.querySelectorAll(".settings-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".settings-section").forEach((s) => s.classList.remove("active"));

    const targetTab = Array.from(document.querySelectorAll(".settings-tab")).find((t) => t.getAttribute("onclick")?.includes(tabName));
    if (targetTab) targetTab.classList.add("active");

    const targetSection = document.getElementById(`sec-${tabName}`);
    if (targetSection) targetSection.classList.add("active");
}

function resetControlsTimer() {
    elements.playerControlsOverlay.classList.remove("hide");
    clearTimeout(state.controlsHideTimer);
    if (!elements.videoPlayer.paused) {
        state.controlsHideTimer = setTimeout(() => {
            if (!elements.playerSettingsPanel.classList.contains("active")) {
                elements.playerControlsOverlay.classList.add("hide");
            }
        }, 3200);
    }
}

function onVideoEnded() {
    if (state.isSeries) {
        showToast("Episode finished. Auto-playing next episode...", 3000);
        navigateEpisode(1);
    }
}

// ==========================================================================
// TV Series Season & Episode Navigation
// ==========================================================================
function renderSeasonTabs(seasons) {
    elements.seasonTabs.innerHTML = "";

    if (!seasons || seasons.length === 0) {
        elements.seasonTabs.innerHTML = `<button class="season-tab active">Season 1</button>`;
        renderEpisodeGrid(1, 10);
        return;
    }

    seasons.forEach((s) => {
        const tab = document.createElement("button");
        tab.className = "season-tab" + (s.season === state.currentSeason ? " active" : "");
        tab.textContent = `Season ${s.season}`;

        tab.addEventListener("click", () => {
            state.currentSeason = s.season;
            document.querySelectorAll(".season-tab").forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            renderEpisodeGrid(s.season, s.episode_count);
        });

        elements.seasonTabs.appendChild(tab);
    });

    const activeSeason = seasons.find((s) => s.season === state.currentSeason) || seasons[0];
    renderEpisodeGrid(activeSeason.season, activeSeason.episode_count);
}

function renderEpisodeGrid(season, count) {
    elements.episodeGrid.innerHTML = "";

    for (let ep = 1; ep <= count; ep++) {
        const btn = document.createElement("button");
        btn.className = "ep-btn" + (season === state.currentSeason && ep === state.currentEpisode ? " active" : "");
        btn.textContent = `Episode ${ep}`;

        btn.addEventListener("click", () => {
            loadEpisode(season, ep);
        });

        elements.episodeGrid.appendChild(btn);
    }

    updateEpisodeTag();
}

async function loadEpisode(season, episode) {
    state.currentSeason = season;
    state.currentEpisode = episode;
    updateEpisodeTag();

    document.querySelectorAll(".ep-btn").forEach((btn, idx) => {
        btn.classList.toggle("active", idx + 1 === episode);
    });

    showToast(`Loading S${season} : E${episode}...`, 2000);
    await loadStreamsAndCaptions(state.currentSubjectId, season, episode, 0, true);
}

function navigateEpisode(direction) {
    const currentSeasonData = state.seasonsData.find((s) => s.season === state.currentSeason);
    const maxEp = currentSeasonData ? currentSeasonData.episode_count : 24;

    const targetEp = state.currentEpisode + direction;
    if (targetEp >= 1 && targetEp <= maxEp) {
        loadEpisode(state.currentSeason, targetEp);
    } else if (direction > 0 && state.currentSeason < state.seasonsData.length) {
        state.currentSeason++;
        renderSeasonTabs(state.seasonsData);
        loadEpisode(state.currentSeason, 1);
    } else {
        showToast("No further episodes available in this season.", 2000);
    }
}

function updateEpisodeTag() {
    if (state.isSeries) {
        elements.playerEpisodeTag.textContent = `S${state.currentSeason} : E${state.currentEpisode}`;
        elements.playerEpisodeTag.style.display = "inline-block";
    }
}

// ==========================================================================
// Keyboard Shortcuts Manager
// ==========================================================================
function handleKeyboardShortcuts(e) {
    if (elements.detailModal.classList.contains("active")) {
        if (e.key === "Escape") closeDetailModal();
        return;
    }

    if (!elements.playerModal.classList.contains("active")) return;

    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

    if (e.key === "Escape") {
        if (elements.playerSettingsPanel.classList.contains("active")) {
            elements.playerSettingsPanel.classList.remove("active");
        } else {
            closePlayer();
        }
        return;
    }

    if (e.code === "Space" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        togglePlay();
        flashCenterIndicator(!elements.videoPlayer.paused);
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipTime(-10);
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipTime(10);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setVolume(Math.min(1, elements.videoPlayer.volume + 0.1));
        showToast(`🔊 Volume ${Math.round(elements.videoPlayer.volume * 100)}%`, 1000);
    } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume(Math.max(0, elements.videoPlayer.volume - 0.1));
        showToast(`🔉 Volume ${Math.round(elements.videoPlayer.volume * 100)}%`, 1000);
    } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
    } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
    } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        togglePiP();
    } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        toggleSubtitlesQuick();
    }
}

// ==========================================================================
// Utility Helpers
// ==========================================================================
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00:00";
    const sec = Math.floor(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function showPlayerLoader(message = "Loading...") {
    elements.playerLoaderText.textContent = message;
    elements.playerLoader.classList.remove("hidden");
}

function hidePlayerLoader() {
    elements.playerLoader.classList.add("hidden");
}

function showToast(message, duration = 2500) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");
    setTimeout(() => {
        elements.toast.classList.remove("show");
    }, duration);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
