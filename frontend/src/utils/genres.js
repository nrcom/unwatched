const GENRE_COLORS = {
  action: 'volcano',
  adventure: 'orange',
  animation: 'cyan',
  biography: 'geekblue',
  comedy: 'gold',
  crime: 'red',
  documentary: 'lime',
  drama: 'purple',
  family: 'green',
  fantasy: 'magenta',
  history: 'geekblue',
  horror: 'red',
  music: 'pink',
  musical: 'pink',
  mystery: 'purple',
  news: 'blue',
  reality: 'cyan',
  romance: 'magenta',
  'science fiction': 'blue',
  'sci-fi': 'blue',
  soap: 'pink',
  sport: 'green',
  talk: 'blue',
  thriller: 'volcano',
  war: 'red',
  western: 'orange',
};

export function genreTagColor(genre) {
  return GENRE_COLORS[String(genre ?? '').trim().toLowerCase()] ?? 'default';
}