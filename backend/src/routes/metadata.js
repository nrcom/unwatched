const { Router } = require('express');
const axios = require('axios');
const radarr = require('../services/radarr');
const sonarr = require('../services/sonarr');
const tautulli = require('../services/tautulli');

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/metadata/movie/:id
// ---------------------------------------------------------------------------
router.get('/movie/:id', async (req, res) => {
  try {
    const movie = await radarr.getMovie(req.params.id);
    res.json({
      ...radarr.normalizeMovie(movie),
      posterPath: `/api/image/movie/${movie.id}/poster`,
    });
  } catch (err) {
    console.error('[metadata/movie]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/metadata/show/:id
// ---------------------------------------------------------------------------
router.get('/show/:id', async (req, res) => {
  try {
    const show = await sonarr.getSeries(req.params.id);
    res.json({
      ...sonarr.normalizeSeries(show),
      posterPath: `/api/image/show/${show.id}/poster`,
    });
  } catch (err) {
    console.error('[metadata/show]', err.message);
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/metadata/tautulli/:ratingKey  — returns Plex metadata (cast etc.)
// ---------------------------------------------------------------------------
router.get('/tautulli/:ratingKey', async (req, res) => {
  try {
    const data = await tautulli.getMetadata(req.params.ratingKey);
    res.json({
      actors: data.actors ?? [],
      directors: data.directors ?? [],
      writers: data.writers ?? [],
      summary: data.summary ?? '',
      genres: data.genres ?? [],
      contentRating: data.content_rating ?? '',
      studio: data.studio ?? '',
      rating: data.rating ?? null,
      audienceRating: data.audience_rating ?? null,
      audienceRatingImage: data.audience_rating_image ?? null,
      ratingImage: data.rating_image ?? null,
      thumb: data.thumb ?? null,
      art: data.art ?? null,
    });
  } catch (err) {
    console.error('[metadata/tautulli]', err.message);
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
