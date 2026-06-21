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

export interface UserPreferences {
  nickname: string;
  actors: ActorItem[];
  genres: GenreItem[];
  favoriteMovies: FavoriteMovieItem[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
}

export interface AggregatedFilters {
  genreIds: number[];
  yearFrom?: number;
  yearTo?: number;
  minRating?: number;
}

export interface Room {
  id: string;
  hostSocketId: string;
  hostNickname: string;
  participants: Participant[];
  status: 'lobby' | 'swiping' | 'ended';
  matchThreshold: number;
  requiredMatches: number;
  filters: { genreId?: number; minRating?: number };
  mode: 'classic' | 'preference';
  wizardStarted: boolean;
  preferences: Record<string, UserPreferences>;
  aggregatedFilters?: AggregatedFilters;
  movies: Movie[];
  currentPage: number;
  likes: Record<number, Set<string>>;
  matchedMovies: Movie[];
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(id) ? generateRoomId() : id;
}

export function createRoom(hostSocketId: string, nickname: string): Room {
  const id = generateRoomId();
  const room: Room = {
    id,
    hostSocketId,
    hostNickname: nickname,
    participants: [{ socketId: hostSocketId, nickname }],
    status: 'lobby',
    matchThreshold: 0,
    requiredMatches: 1,
    filters: {},
    mode: 'classic',
    wizardStarted: false,
    preferences: {},
    movies: [],
    currentPage: 1,
    likes: {},
    matchedMovies: [],
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  return rooms.get(id);
}

export function deleteRoom(id: string): void {
  rooms.delete(id);
}

export function findRoomBySocket(socketId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.participants.some((p) => p.socketId === socketId)) {
      return room;
    }
  }
  return undefined;
}

export function addParticipant(room: Room, socketId: string, nickname: string): void {
  room.participants.push({ socketId, nickname });
}

export function removeParticipant(room: Room, socketId: string): void {
  room.participants = room.participants.filter((p) => p.socketId !== socketId);
  for (const movieId in room.likes) {
    room.likes[Number(movieId)].delete(socketId);
  }
  // Preferences are intentionally kept so they survive brief reconnects.
  // They are cleaned up when the room is deleted.
}

export function recordLike(room: Room, movieId: number, socketId: string): boolean {
  if (!room.likes[movieId]) {
    room.likes[movieId] = new Set();
  }
  room.likes[movieId].add(socketId);

  const threshold = room.matchThreshold > 0
    ? room.matchThreshold
    : room.participants.length;

  return room.likes[movieId].size >= threshold;
}

export function aggregatePreferences(
  preferences: Record<string, UserPreferences>
): AggregatedFilters & { favoriteMovieIds: number[] } {
  const prefs = Object.values(preferences);
  if (prefs.length === 0) {
    return { genreIds: [], favoriteMovieIds: [] };
  }

  const genreVotes: Record<number, number> = {};
  prefs.forEach((p) =>
    p.genres.forEach((g) => {
      genreVotes[g.id] = (genreVotes[g.id] || 0) + 1;
    })
  );
  const genreIds = Object.entries(genreVotes)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => Number(id));

  const favoriteMovieIds = [...new Set(prefs.flatMap((p) => p.favoriteMovies.map((m) => m.id)))];

  const yearFromValues = prefs.filter((p) => p.yearFrom).map((p) => p.yearFrom!);
  const yearToValues = prefs.filter((p) => p.yearTo).map((p) => p.yearTo!);
  const ratingValues = prefs.filter((p) => p.minRating).map((p) => p.minRating!);

  const avg = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : undefined;

  return {
    genreIds,
    favoriteMovieIds,
    yearFrom: avg(yearFromValues),
    yearTo: avg(yearToValues),
    minRating: ratingValues.length
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
      : undefined,
  };
}

export function getPublicRoom(room: Room) {
  // Match submitted preferences to current participants by socketId OR by nickname
  // (nickname fallback handles socket reconnection where the ID changes)
  const submittedSids = new Set(Object.keys(room.preferences));
  const preferencesSubmitted = room.participants
    .filter((p) =>
      submittedSids.has(p.socketId) ||
      Object.values(room.preferences).some((pref) => pref.nickname === p.nickname)
    )
    .map((p) => p.socketId);

  return {
    id: room.id,
    hostSocketId: room.hostSocketId,
    participants: room.participants,
    status: room.status,
    matchThreshold: room.matchThreshold,
    requiredMatches: room.requiredMatches,
    filters: room.filters,
    mode: room.mode,
    wizardStarted: room.wizardStarted,
    preferencesSubmitted,
    matchedMovies: room.matchedMovies,
  };
}
