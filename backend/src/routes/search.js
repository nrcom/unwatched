const { Router } = require('express');
const radarr = require('../services/radarr');
const sonarr = require('../services/sonarr');
const tautulli = require('../services/tautulli');
const { mediaCache, historyCache } = require('../utils/cache');

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRating(item, provider) {
  if (!item.ratings) return null;
  const val = item.ratings[provider];
  if (val == null) return null;

  // Normalize Rotten Tomatoes (0–100) and Metacritic (0–100) to 0–10 scale
  if (provider === 'rottenTomatoes' || provider === 'metacritic') {
    return val / 10;
  }
  return val;
}

function yearOf(isoString) {
  if (!isoString) return null;
  return new Date(isoString).getFullYear();
}

// ---------------------------------------------------------------------------
// Build watched sets for the selected users
// ---------------------------------------------------------------------------

/**
 * Builds watched sets keyed by normalised title+year strings taken directly
 * from Tautulli history records.  This avoids the fragile ratingKey lookup
 * via get_library_media_info and works even when title normalisation between
 * Sonarr/Radarr and Plex/Tautulli differs slightly.
 *
 * For movies  : uses h.title + h.year
 * For episodes: uses h.grandparent_title (show name) + h.year
 *
 * We also store a year-agnostic key as a fallback so that minor year
 * discrepancies between Sonarr/Radarr metadata and Tautulli don't cause
 * watched items to slip through.
 */
async function buildWatchedSets(userIds, includeMovies, includeShows) {
  const watched = {}; // { userId: Set<titleKey> }

  await Promise.all(
    userIds.map(async (userId) => {
      const userWatched = new Set();
      watched[userId] = userWatched;

      const fetches = [];

      if (includeMovies) {
        fetches.push(
          historyCache
            .getOrFetch(`history:${userId}:movie`, () =>
              tautulli.getAllHistoryForUser(userId, 'movie')
            )
            .then((items) => ({ mediaType: 'movie', items: items ?? [] }))
        );
      }

      if (includeShows) {
        fetches.push(
          historyCache
            .getOrFetch(`history:${userId}:episode`, () =>
              tautulli.getAllHistoryForUser(userId, 'episode')
            )
            .then((items) => ({ mediaType: 'episode', items: items ?? [] }))
        );
      }

      const results = await Promise.all(fetches);

      for (const { mediaType, items } of results) {
        for (const h of items) {
          if (mediaType === 'movie') {
            const keyWithYear = tautulli.makeTitleKey(h.title, h.year);
            const keyNoYear   = tautulli.makeTitleKey(h.title, null);
            if (keyWithYear) userWatched.add(keyWithYear);
            if (keyNoYear)   userWatched.add(keyNoYear);
          } else {
            // episode — grandparent_title is the show title
            const keyWithYear = tautulli.makeTitleKey(h.grandparent_title, h.year);
            const keyNoYear   = tautulli.makeTitleKey(h.grandparent_title, null);
            if (keyWithYear) userWatched.add(keyWithYear);
            if (keyNoYear)   userWatched.add(keyNoYear);
          }
        }
      }
    })
  );

  return { watched };
}

/**
 * Returns true only if NONE of the selected users have a watched entry
 * matching the item's title key.  We check both the year-qualified key
 * and the year-agnostic key so a minor year mismatch does not cause a
 * watched item to be shown as unwatched.
 */
function isUnwatchedByAll(titleKey, titleKeyNoYear, userIds, watched) {
  if (!userIds.length) return true;
  for (const uid of userIds) {
    const set = watched[uid];
    if (!set) continue;
    if (titleKey && set.has(titleKey)) return false;
    if (titleKeyNoYear && set.has(titleKeyNoYear)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// POST /api/search
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
  try {
    const {
      userIds = [],
      includeMovies = true,
      includeShows = true,
      genres = [],
      yearRange = null,        // [minYear, maxYear]
      minRating = 0,
      ratingProvider = 'tmdb', // tmdb | imdb | rottenTomatoes | metacritic | tvdb
      contentRatings = [],
      minRuntime = null,
      maxRuntime = null,
      showStatus = [],         // 'continuing' | 'ended'
    } = req.body;

    // ------------------------------------------------------------------
    // 1. Fetch media from Radarr / Sonarr
    // ------------------------------------------------------------------
    const [allMovies, allSeries] = await Promise.all([
      includeMovies
        ? mediaCache.getOrFetch('radarr:movies', () => radarr.getAllMovies())
        : Promise.resolve([]),
      includeShows
        ? mediaCache.getOrFetch('sonarr:series', () => sonarr.getAllSeries())
        : Promise.resolve([]),
    ]);

    // ------------------------------------------------------------------
    // 2. Build watched sets (only if users were selected)
    // ------------------------------------------------------------------
    let watched = {};

    if (userIds.length > 0) {
      const result = await buildWatchedSets(userIds, includeMovies, includeShows);
      watched = result.watched;
    }

    // ------------------------------------------------------------------
    // 3. Filter & normalize movies
    // ------------------------------------------------------------------
    const results = [];

    if (includeMovies) {
      for (const movie of allMovies) {
        if (!movie.hasFile) continue; // only downloaded content

        // Genre filter
        if (genres.length > 0 && !genres.some((g) => (movie.genres ?? []).includes(g))) continue;

        // Year filter (use inCinemas or year field)
        if (yearRange) {
          const y = movie.year ?? yearOf(movie.inCinemas);
          if (!y || y < yearRange[0] || y > yearRange[1]) continue;
        }

        // Rating filter
        if (minRating > 0) {
          const provider = ratingProvider === 'tvdb' ? 'tmdb' : ratingProvider;
          const rating = getRating(radarr.normalizeMovie(movie), provider);
          if (rating == null || rating < minRating) continue;
        }

        // Content rating filter
        if (contentRatings.length > 0 && !contentRatings.includes(movie.certification)) continue;

        // Runtime filter
        if (minRuntime != null && (movie.runtime ?? 0) < minRuntime) continue;
        if (maxRuntime != null && (movie.runtime ?? 0) > maxRuntime) continue;

        // Watch status filter
        if (userIds.length > 0) {
          const key       = tautulli.makeTitleKey(movie.title, movie.year);
          const keyNoYear = tautulli.makeTitleKey(movie.title, null);
          if (!isUnwatchedByAll(key, keyNoYear, userIds, watched)) continue;
        }

        results.push({
          ...radarr.normalizeMovie(movie),
          posterPath: `/api/image/movie/${movie.id}/poster`,
        });
      }
    }

    // ------------------------------------------------------------------
    // 4. Filter & normalize shows
    // ------------------------------------------------------------------
    if (includeShows) {
      for (const show of allSeries) {
        // Genre filter
        if (genres.length > 0 && !genres.some((g) => (show.genres ?? []).includes(g))) continue;

        // Year filter
        if (yearRange) {
          const y = show.year ?? yearOf(show.firstAired);
          if (!y || y < yearRange[0] || y > yearRange[1]) continue;
        }

        // Rating filter — Sonarr only has a single TVDB rating
        if (minRating > 0 && ratingProvider === 'tvdb') {
          const val = show.ratings?.value ?? null;
          if (val == null || val < minRating) continue;
        } else if (minRating > 0 && ratingProvider !== 'tvdb') {
          // Other providers not available for shows → skip the filter (include all)
        }

        // Content rating filter
        if (contentRatings.length > 0 && !contentRatings.includes(show.certification)) continue;

        // Runtime filter
        if (minRuntime != null && (show.runtime ?? 0) < minRuntime) continue;
        if (maxRuntime != null && (show.runtime ?? 0) > maxRuntime) continue;

        // Show status filter
        if (showStatus.length > 0 && !showStatus.includes(show.status)) continue;

        // Watch status filter
        if (userIds.length > 0) {
          const key       = tautulli.makeTitleKey(show.title, show.year);
          const keyNoYear = tautulli.makeTitleKey(show.title, null);
          if (!isUnwatchedByAll(key, keyNoYear, userIds, watched)) continue;
        }

        const norm = sonarr.normalizeSeries(show);
        results.push({
          ...norm,
          posterPath: `/api/image/show/${show.id}/poster`,
        });
      }
    }

    // ------------------------------------------------------------------
    // 5. Sort alphabetically by title
    // ------------------------------------------------------------------
    results.sort((a, b) => {
      const ta = (a.sortTitle ?? a.title).toLowerCase();
      const tb = (b.sortTitle ?? b.title).toLowerCase();
      return ta.localeCompare(tb);
    });

    res.json(results);
  } catch (err) {
    console.error('[search]', err.message, err.stack);
    res.status(500).json({ error: `Search failed: ${err.message}` });
  }
});

module.exports = router;
