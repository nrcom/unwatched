const axios = require('axios');

// Support both spellings (original .env had TAUTILLI typo, now corrected to TAUTULLI)
const BASE_URL = process.env.TAUTULLI_URL ?? process.env.TAUTILLI_URL;
const API_KEY = process.env.TAUTULLI_API_KEY ?? process.env.TAUTILLI_API_KEY;

const cfHeaders = process.env.CF_ACCESS_CLIENT_ID
  ? {
      'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET,
    }
  : {};

async function callApi(cmd, params = {}) {
  const response = await axios.get(`${BASE_URL}/api/v2`, {
    params: { apikey: API_KEY, cmd, ...params },
    headers: cfHeaders,
    timeout: 30000,
  });

  const result = response.data?.response;
  if (!result || result.result !== 'success') {
    throw new Error(`Tautulli error for cmd=${cmd}: ${result?.message || 'Unknown error'}`);
  }
  return result.data;
}

async function getUsers() {
  return callApi('get_users');
}

async function getLibraries() {
  return callApi('get_libraries');
}

async function getLibraryMediaInfo(sectionId, start = 0, length = 1000) {
  return callApi('get_library_media_info', {
    section_id: sectionId,
    start,
    length,
    order_column: 'sort_title',
    order_dir: 'asc',
  });
}

async function getHistory(params = {}) {
  const { userId, mediaType, start = 0, length = 1000 } = params;
  return callApi('get_history', {
    user_id: userId,
    media_type: mediaType,
    grouping: 1,
    start,
    length,
  });
}

async function getMetadata(ratingKey) {
  return callApi('get_metadata', { rating_key: ratingKey });
}

/**
 * Fetches all history pages for a user + media type.
 * Returns an array of all history items.
 */
async function getAllHistoryForUser(userId, mediaType) {
  const PAGE_SIZE = 1000;
  let start = 0;
  const allItems = [];

  while (true) {
    const result = await getHistory({ userId, mediaType, start, length: PAGE_SIZE });
    const items = result?.data ?? [];
    if (items.length === 0) break;
    allItems.push(...items);
    const total = result?.recordsTotal ?? 0;
    if (allItems.length >= total) break;
    start += PAGE_SIZE;
  }

  return allItems;
}

/**
 * Builds a map of { titleKey → ratingKey } for all movie/show library sections.
 */
async function buildTitleRatingKeyMap() {
  const libraries = await getLibraries();
  const titleMap = {};

  const relevant = libraries.filter(
    (l) => l.section_type === 'movie' || l.section_type === 'show'
  );

  for (const lib of relevant) {
    let start = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const info = await getLibraryMediaInfo(lib.section_id, start, PAGE_SIZE);
      const items = info?.data ?? [];
      if (items.length === 0) break;

      for (const item of items) {
        const key = makeTitleKey(item.title, item.year);
        if (key && !titleMap[key]) {
          titleMap[key] = String(item.rating_key);
        }
      }

      const total = info?.recordsTotal ?? 0;
      if (start + items.length >= total) break;
      start += PAGE_SIZE;
    }
  }

  return titleMap;
}

function makeTitleKey(title, year) {
  if (!title) return null;
  const normalized = title
    .toLowerCase()
    .replace(/^(the |a |an )/i, '')
    .replace(/[^\w]/g, '');
  return `${normalized}-${year}`;
}

module.exports = {
  getUsers,
  getLibraries,
  getLibraryMediaInfo,
  getHistory,
  getAllHistoryForUser,
  getMetadata,
  buildTitleRatingKeyMap,
  makeTitleKey,
};
