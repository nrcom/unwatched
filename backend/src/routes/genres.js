const { Router } = require('express');
const radarr = require('../services/radarr');
const sonarr = require('../services/sonarr');
const { mediaCache } = require('../utils/cache');

const router = Router();

// GET /api/genres  — returns { movies: [...], shows: [...], all: [...] }
router.get('/', async (_req, res) => {
  try {
    const [movies, series] = await Promise.all([
      mediaCache.getOrFetch('radarr:movies', () => radarr.getAllMovies()),
      mediaCache.getOrFetch('sonarr:series', () => sonarr.getAllSeries()),
    ]);

    const movieGenres = new Set();
    const showGenres = new Set();

    for (const m of movies) {
      (m.genres ?? []).forEach((g) => movieGenres.add(g));
    }
    for (const s of series) {
      (s.genres ?? []).forEach((g) => showGenres.add(g));
    }

    const all = new Set([...movieGenres, ...showGenres]);

    const movieCerts = new Set(movies.map((m) => m.certification).filter(Boolean));
    const showCerts = new Set(series.map((s) => s.certification).filter(Boolean));
    const allCerts = [...new Set([...movieCerts, ...showCerts])].sort();

    res.json({
      movies: [...movieGenres].sort(),
      shows: [...showGenres].sort(),
      all: [...all].sort(),
      contentRatings: allCerts,
    });
  } catch (err) {
    console.error('[genres]', err.message);
    res.status(502).json({ error: `Failed to fetch genres: ${err.message}` });
  }
});

module.exports = router;
