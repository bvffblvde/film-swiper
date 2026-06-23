export interface Participant {
  socketId: string;
  nickname: string;
}

export interface Movie {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  rating: number;
  genres: string[];
  actors: string[];
}

export interface ActorItem {
  id: number;
  name: string;
  profilePath: string | null;
}

export interface GenreItem {
  id: number;
  name: string;
}

export interface FavoriteMovieItem {
  id: number;
  title: string;
  posterPath: string | null;
}

export interface SampleMovie {
  id: number;
  title: string;
  posterPath: string | null;
  rating: number;
}

export interface UserPreferences {
  nickname: string;
  actors: ActorItem[];
  genres: GenreItem[];
  favoriteMovies: FavoriteMovieItem[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
}

export interface Room {
  id: string;
  hostSocketId: string;
  participants: Participant[];
  status: 'lobby' | 'swiping' | 'ended';
  matchThreshold: number;
  requiredMatches: number;
  filters: {
    genreId?: number;
    minRating?: number;
    yearFrom?: number;
    yearTo?: number;
    excludedCountries?: string[];
  };
  mode: 'classic' | 'preference';
  wizardStarted: boolean;
  preferencesSubmitted: string[];
  matchedMovies: Movie[];
}

export interface MatchEvent {
  movie: Movie;
  matchNumber: number;
  requiredMatches: number;
  allMatches: Movie[];
  isComplete: boolean;
}
