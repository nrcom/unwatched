const API = '/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const getUsers = () => apiFetch('/users');

export const getGenres = () => apiFetch('/genres');

export const search = (filters) =>
  apiFetch('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });

export const getMovieMetadata = (id) => apiFetch(`/metadata/movie/${id}`);

export const getShowMetadata = (id) => apiFetch(`/metadata/show/${id}`);

export const getTautulliMetadata = (ratingKey) =>
  apiFetch(`/metadata/tautulli/${ratingKey}`);
