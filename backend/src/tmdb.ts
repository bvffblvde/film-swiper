import { Movie, ActorItem, GenreItem } from './store';

const BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY || '';

async function get<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${sep}api_key=${API_KEY}&language=ru-RU`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = (await res.json()) as Record<string, unknown>;
  if (data.status_code && data.status_message) {
    console.error(`TMDB error [${path}]:`, data.status_message);
    throw new Error(`TMDB: ${data.status_message}`);
  }
  return data as T;
}

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  genre_ids: number[];
}

interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  genres: { id: number; name: string }[];
}

interface TmdbPerson {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department: string;
}

interface TmdbCastMember {
  name: string;
  known_for_department: string;
}

let genreCache: Record<number, string> = {};
let genreListCache: GenreItem[] = [];

export async function fetchGenres(): Promise<Record<number, string>> {
  if (Object.keys(genreCache).length > 0) return genreCache;
  const data = await get<{ genres: { id: number; name: string }[] }>('/genre/movie/list');
  genreCache = {};
  genreListCache = [];
  for (const g of data.genres) {
    genreCache[g.id] = g.name;
    genreListCache.push({ id: g.id, name: g.name });
  }
  return genreCache;
}

export async function fetchGenreList(): Promise<GenreItem[]> {
  await fetchGenres();
  return genreListCache;
}

export async function fetchMovieCredits(movieId: number): Promise<string[]> {
  const data = await get<{ cast: TmdbCastMember[] }>(`/movie/${movieId}/credits`);
  if (!Array.isArray(data.cast)) return [];
  return data.cast
    .filter((m) => m.known_for_department === 'Acting')
    .slice(0, 3)
    .map((m) => m.name);
}

export async function fetchMovies(
  page: number,
  genreId?: number,
  minRating?: number
): Promise<{ movies: TmdbMovie[]; totalPages: number }> {
  let path: string;
  if (genreId || minRating) {
    const params = new URLSearchParams({ page: String(page), sort_by: 'popularity.desc' });
    if (genreId) params.set('with_genres', String(genreId));
    if (minRating) params.set('vote_average.gte', String(minRating));
    path = `/discover/movie?${params}`;
  } else {
    path = `/movie/popular?page=${page}`;
  }
  const data = await get<{ results: TmdbMovie[]; total_pages: number }>(path);
  if (!Array.isArray(data.results)) {
    console.error('TMDB unexpected response:', JSON.stringify(data).slice(0, 300));
    return { movies: [], totalPages: 0 };
  }
  return { movies: data.results, totalPages: data.total_pages };
}

export async function fetchMoviesWithFilters(
  page: number,
  genreIds: number[],
  yearFrom?: number,
  yearTo?: number,
  minRating?: number
): Promise<TmdbMovie[]> {
  const params = new URLSearchParams({
    page: String(page),
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
  });
  if (genreIds.length > 0) params.set('with_genres', genreIds.slice(0, 3).join('|'));
  if (yearFrom) params.set('primary_release_date.gte', `${yearFrom}-01-01`);
  if (yearTo) params.set('primary_release_date.lte', `${yearTo}-12-31`);
  if (minRating) params.set('vote_average.gte', String(minRating));

  const data = await get<{ results: TmdbMovie[] }>(`/discover/movie?${params}`);
  if (!Array.isArray(data.results)) return [];
  return data.results;
}

export async function fetchMovieWithCredits(
  movieId: number,
  genreMap: Record<number, string>
): Promise<Movie> {
  const [detail, actors] = await Promise.all([
    get<TmdbMovieDetail>(`/movie/${movieId}`),
    fetchMovieCredits(movieId).catch(() => [] as string[]),
  ]);
  return {
    id: detail.id,
    title: detail.title,
    overview: detail.overview,
    posterPath: detail.poster_path,
    rating: Math.round(detail.vote_average * 10) / 10,
    genres: detail.genres.map((g) => g.name),
    actors,
  };
}

export async function searchActors(query: string): Promise<ActorItem[]> {
  const data = await get<{ results: TmdbPerson[] }>(
    `/search/person?query=${encodeURIComponent(query)}`
  );
  if (!Array.isArray(data.results)) return [];
  return data.results
    .filter((p) => p.known_for_department === 'Acting')
    .slice(0, 10)
    .map((p) => ({ id: p.id, name: p.name, profilePath: p.profile_path }));
}

export async function fetchSampleMovies(
  genreIds: number[],
  page = 1
): Promise<{ id: number; title: string; posterPath: string | null; rating: number }[]> {
  const params = new URLSearchParams({
    page: String(page),
    sort_by: 'popularity.desc',
    'vote_count.gte': '100',
  });
  if (genreIds.length > 0) params.set('with_genres', genreIds.slice(0, 3).join('|'));

  const data = await get<{ results: TmdbMovie[] }>(`/discover/movie?${params}`);
  if (!Array.isArray(data.results)) return [];
  return data.results.map((m) => ({
    id: m.id,
    title: m.title,
    posterPath: m.poster_path,
    rating: Math.round(m.vote_average * 10) / 10,
  }));
}
