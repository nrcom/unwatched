const axios = require('axios');

const BASE_URL = process.env.SONARR_URL;
const API_KEY = process.env.SONARR_API_KEY;

const cfHeaders = process.env.CF_ACCESS_CLIENT_ID
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : {};

const client = axios.create({
  baseURL: `${BASE_URL}/api/v3`,
  headers: { 'X-Api-Key': API_KEY, ...cfHeaders },
  timeout: 30000,
});

async function getAllSeries() {
  const response = await client.get('/series');
  return response.data;
}

async function getSeries(seriesId) {
  const response = await client.get(`/series/${seriesId}`);
  return response.data;
}

function getPosterUrl(seriesId, size = '') {
  const filename = size ? `poster-${size}.jpg` : 'poster.jpg';
  return `${BASE_URL}/api/v3/mediacover/${seriesId}/${filename}?apikey=${API_KEY}`;
}

/**
 * Normalize a Sonarr series into the app's standard shape.
 */
function normalizeSeries(show) {
  const stats = show.statistics ?? {};
  const ratings = show.ratings ?? {};
  const seasonCount = (show.seasons ?? []).filter((s) => s.seasonNumber > 0).length;

  return {
    type: 'show',
    id: show.id,
    title: show.title,
    sortTitle: show.sortTitle ?? show.title,
    year: show.year,
    genres: show.genres ?? [],
    overview: show.overview ?? '',
    runtime: show.runtime ?? 0,
    certification: show.certification ?? '',
    network: show.network ?? '',
    status: show.status ?? '',
    seasonCount,
    episodeCount: stats.episodeCount ?? 0,
    totalEpisodeCount: stats.totalEpisodeCount ?? 0,
    tvdbId: show.tvdbId ?? null,
    imdbId: show.imdbId ?? null,
    firstAired: show.firstAired ?? null,
    added: show.added ?? null,
    monitored: show.monitored ?? true,
    ratings: {
      // Sonarr v3 ratings come from TVDB
      tvdb: ratings.value ?? null,
    },
    popularity: show.popularity ?? null,
    youTubeTrailerId: null, // Sonarr does not expose this
  };
}

module.exports = { getAllSeries, getSeries, getPosterUrl, normalizeSeries };
