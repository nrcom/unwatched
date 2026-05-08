const { Router } = require('express');
const tautulli = require('../services/tautulli');
const { mediaCache } = require('../utils/cache');

const router = Router();

const excludedUsers = new Set(
  (process.env.EXCLUDED_PLEX_USERS ?? '')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean)
);

// GET /api/users
router.get('/', async (_req, res) => {
  try {
    const users = await mediaCache.getOrFetch('tautulli:users', () => tautulli.getUsers());
    const shaped = (users ?? [])
      .filter((u) => u.is_active)
      .filter((u) => !excludedUsers.has((u.username ?? '').toLowerCase()))
      .map((u) => ({
        userId: u.user_id,
        username: u.username,
        friendlyName: u.username, // get_users returns username not friendly_name
        thumb: u.thumb ?? null,
        isAdmin: u.is_admin === 1,
      }))
      .sort((a, b) => a.friendlyName.localeCompare(b.friendlyName));

    res.json(shaped);
  } catch (err) {
    console.error('[users]', err.message);
    res.status(502).json({ error: `Failed to fetch users: ${err.message}` });
  }
});

module.exports = router;
