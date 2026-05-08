<div align="center">

# 🎬 UNWATCHED
### Plex Discovery — Find what nobody has seen yet

**Unwatched** is a self-hosted dark-mode web app that cross-references your **Radarr**, **Sonarr**, and **Tautulli** libraries to surface movies and TV shows that one or more of your Plex users haven't watched yet.

[![Patreon](https://img.shields.io/badge/Support-Patreon-FF424D?style=for-the-badge&logo=patreon&logoColor=white)](https://patreon.com/NRCOM)
[![GitHub](https://img.shields.io/badge/GitHub-Unwatched-181717?style=for-the-badge&logo=github)](https://github.com/orgs/NRCOM/Unwatched)

</div>

---

## ✨ Features

- **Multi-user watch filtering** — select one or more Plex users; only content unwatched by *all* selected users is returned
- **Movies & TV shows** — pulls your full Radarr and Sonarr libraries in one view
- **Rich filters** — genre, release year range, rating provider (TMDB / IMDb / Rotten Tomatoes / Metacritic / TVDB), content rating, runtime, and show status
- **Sortable, filterable table** — sort by title, year, popularity, rating, runtime, studio/network, or date added
- **Detail drawer** — click any row for a full metadata panel with ratings, runtime, trailer link, overview, and external links (IMDb, TMDB, TVDB)
- **Persistent search state** — filter selections are saved across page refreshes; only cleared when you hit Reset
- **Collapsible sidebar** — collapse the search panel for a full-width results view with a single click
- **Poster images** — proxied server-side so API keys are never exposed to the browser
- **Dark mode** — built on Ant Design v5 with a Plex-inspired dark theme throughout
- **Cloudflare Access support** — optional service token authentication for instances behind Cloudflare Zero Trust
- **Docker Compose with hot reload** — both frontend (Vite) and backend (nodemon) reload on file save

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Ant Design 5 |
| Backend | Node.js, Express 4, Axios |
| Data sources | Radarr v3 API, Sonarr v3 API, Tautulli API v2 |
| Infrastructure | Docker Compose |

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A running **Radarr**, **Sonarr**, and **Tautulli** instance
- API keys for each service

### 1. Clone the repo

```bash
git clone https://github.com/nicholasrenard/Unwatched.git
cd Unwatched
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values (see [Configuration](#-configuration) below).

### 3. Start with Docker Compose

```bash
docker compose up -d --build
```

The app will be available at **http://localhost:5173** (or whatever `FRONTEND_PORT` you set).

---

## ⚙️ Configuration

All configuration is via the `.env` file. Copy `.env.example` to get started.

| Variable | Required | Description |
|---|---|---|
| `TAUTULLI_URL` | ✅ | Base URL of your Tautulli instance |
| `TAUTULLI_API_KEY` | ✅ | Tautulli API key (Settings → Web Interface → API Key) |
| `RADARR_URL` | ✅ | Base URL of your Radarr instance |
| `RADARR_API_KEY` | ✅ | Radarr API key (Settings → General → API Key) |
| `SONARR_URL` | ✅ | Base URL of your Sonarr instance |
| `SONARR_API_KEY` | ✅ | Sonarr API key (Settings → General → API Key) |
| `BACKEND_PORT` | — | Port for the Express backend (default: `3001`) |
| `FRONTEND_PORT` | — | Port for the Vite frontend (default: `5173`) |
| `APP_URL` | — | Public URL of the app (default: `http://localhost:5173`) |
| `BACKEND_PROXY_URL` | — | URL Vite proxies `/api` to; override for non-Docker dev (default: `http://localhost:3001`) |
| `CF_ACCESS_CLIENT_ID` | — | Cloudflare Access service token Client ID (optional) |
| `CF_ACCESS_CLIENT_SECRET` | — | Cloudflare Access service token Client Secret (optional) |
| `EXCLUDED_PLEX_USERS` | — | Comma-separated usernames to hide from the user selector |

### Cloudflare Access

If your Radarr, Sonarr, or Tautulli instances are protected by Cloudflare Zero Trust, create a **Service Token** in Zero Trust → Access → Service Auth → Service Tokens, then add a **Service Auth** policy to each application that includes the token. Set `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` in your `.env`.

---

## 🔍 How It Works

1. **Library fetch** — Radarr and Sonarr provide the full catalog of downloaded movies and series
2. **Watch history** — Tautulli `get_history` is called per user (paginated) to build a set of watched titles
3. **Cross-reference** — Each item's normalised title key (lowercase, article-stripped, non-word chars removed) is compared against the watched sets for all selected users
4. **Result** — Only items unwatched by *every* selected user are returned

Results and watch history are cached in memory (10-minute TTL for library data, 3-minute TTL for history) to keep the UI snappy.

---

## 🐳 Docker Compose Details

Both services use volume mounts so changes to source files hot-reload without a rebuild:

- **Backend** (`./backend`) — nodemon watches `src/**` and restarts on any `.js` or `.json` change
- **Frontend** (`./frontend`) — Vite HMR handles all React and asset changes instantly

To restart after changing `.env`:

```bash
docker compose up -d --force-recreate
```

---

## 📄 License

MIT — do whatever you want with it.

---

<div align="center">

Made with ❤️ by [NRCOM](https://github.com/orgs/NRCOM)

</div>
