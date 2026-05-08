const { Router } = require('express');
const axios = require('axios');

const router = Router();

const cfHeaders = process.env.CF_ACCESS_CLIENT_ID
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : {};

async function proxyImage(url, res) {
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: cfHeaders,
      timeout: 15000,
    });
    res.set('Content-Type', response.headers['content-type'] ?? 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    response.data.pipe(res);
  } catch (err) {
    // Return a 1×1 transparent PNG on error instead of breaking the UI
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set('Content-Type', 'image/png');
    res.status(200).send(transparentPng);
  }
}

// GET /api/image/movie/:movieId/poster
router.get('/movie/:movieId/poster', async (req, res) => {
  const url = `${process.env.RADARR_URL}/api/v3/mediacover/${req.params.movieId}/poster.jpg?apikey=${process.env.RADARR_API_KEY}`;
  await proxyImage(url, res);
});

// GET /api/image/show/:showId/poster
router.get('/show/:showId/poster', async (req, res) => {
  const url = `${process.env.SONARR_URL}/api/v3/mediacover/${req.params.showId}/poster.jpg?apikey=${process.env.SONARR_API_KEY}`;
  await proxyImage(url, res);
});

module.exports = router;
