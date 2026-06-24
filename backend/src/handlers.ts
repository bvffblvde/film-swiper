import { Server, Socket } from 'socket.io';
import {
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
  recordLike,
  findRoomBySocket,
  getPublicRoom,
  deleteRoom,
  aggregatePreferences,
  Movie,
  UserPreferences,
} from './store';
import {
  fetchMovies,
  fetchGenres,
  fetchTvGenres,
  fetchMovieCredits,
  fetchTvCredits,
  fetchMoviesWithFilters,
  fetchMovieWithCredits,
} from './tmdb';

const COUNTRY_LANGUAGES: Record<string, string[]> = {
  IN: ['hi', 'ta', 'te', 'ml', 'kn', 'mr'],
  JP: ['ja'],
  KR: ['ko'],
  CN: ['zh'],
  TW: ['zh'],
  HK: ['zh'],
  RU: ['ru'],
  TR: ['tr'],
  IR: ['fa'],
  TH: ['th'],
  PL: ['pl'],
  SE: ['sv'],
  DK: ['da'],
  NO: ['no', 'nb'],
  FI: ['fi'],
  HU: ['hu'],
  CZ: ['cs'],
  RO: ['ro'],
  GR: ['el'],
  UA: ['uk'],
  NL: ['nl'],
  PT: ['pt'],
  BR: ['pt'],
};

function getExcludeLanguages(excludedCountries?: string[]): string[] {
  if (!excludedCountries || excludedCountries.length === 0) return [];
  return [...new Set(excludedCountries.flatMap((c) => COUNTRY_LANGUAGES[c] ?? []))];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function buildMoviesFromRaw(
  raw: { id: number; title?: string; name?: string; overview: string; poster_path: string | null; vote_average: number; genre_ids: number[] }[],
  genreMap: Record<number, string>,
  isTV = false
): Promise<Movie[]> {
  return Promise.all(
    raw.map(async (m) => ({
      id: m.id,
      title: m.title || m.name || '',
      overview: m.overview,
      posterPath: m.poster_path,
      rating: Math.round(m.vote_average * 10) / 10,
      genres: m.genre_ids.map((id) => genreMap[id]).filter(Boolean),
      actors: await (isTV ? fetchTvCredits(m.id) : fetchMovieCredits(m.id)).catch(() => []),
    }))
  );
}

async function loadClassicMovies(
  page: number,
  genreId?: number,
  minRating?: number,
  yearFrom?: number,
  yearTo?: number,
  excludedCountries?: string[],
  mediaType?: 'movie' | 'tv' | 'anime'
): Promise<Movie[]> {
  const excludeLanguages = getExcludeLanguages(excludedCountries);
  const isTV = mediaType === 'tv' || mediaType === 'anime';
  const [{ movies: raw, isTV: fetchedAsTV }, genreMap] = await Promise.all([
    fetchMovies(page, genreId, minRating, yearFrom, yearTo, excludeLanguages, mediaType),
    isTV ? fetchTvGenres() : fetchGenres(),
  ]);
  return buildMoviesFromRaw(raw, genreMap, fetchedAsTV);
}

async function loadPreferenceMovies(
  genreIds: number[],
  page: number,
  favoriteMovieIds: number[],
  yearFrom?: number,
  yearTo?: number,
  minRating?: number
): Promise<Movie[]> {
  const genreMap = await fetchGenres();

  const [discoverRaw, ...favResults] = await Promise.all([
    fetchMoviesWithFilters(page, genreIds, yearFrom, yearTo, minRating),
    ...favoriteMovieIds.slice(0, 8).map((id) =>
      fetchMovieWithCredits(id, genreMap).catch(() => null)
    ),
  ]);

  const discoverMovies = await buildMoviesFromRaw(discoverRaw, genreMap);
  const favMovies = (favResults as (Movie | null)[]).filter(Boolean) as Movie[];

  const favIds = new Set(favMovies.map((m) => m.id));
  return [...favMovies, ...discoverMovies.filter((m) => !favIds.has(m.id))];
}

export function registerHandlers(io: Server, socket: Socket) {
  socket.on(
    'create-room',
    async ({ nickname }: { nickname: string }, callback: (data: { roomId: string }) => void) => {
      const room = createRoom(socket.id, nickname);
      socket.join(room.id);
      callback({ roomId: room.id });
      io.to(room.id).emit('room-updated', getPublicRoom(room));
    }
  );

  socket.on(
    'join-room',
    (
      { roomId, nickname }: { roomId: string; nickname: string },
      callback: (data: { success: boolean; error?: string; room?: ReturnType<typeof getPublicRoom> }) => void
    ) => {
      const room = getRoom(roomId);
      if (!room) {
        callback({ success: false, error: 'Комната не найдена' });
        return;
      }
      if (room.participants.some((p) => p.socketId === socket.id)) {
        socket.join(roomId);
        callback({ success: true, room: getPublicRoom(room) });
        return;
      }
      if (room.status !== 'lobby') {
        callback({ success: false, error: 'Сессия уже началась' });
        return;
      }
      if (room.participants.length >= 6) {
        callback({ success: false, error: 'Комната заполнена (максимум 6)' });
        return;
      }

      addParticipant(room, socket.id, nickname);
      socket.join(roomId);

      // Transfer preferences from a previous disconnected session with the same nickname
      const oldPrefEntry = Object.entries(room.preferences).find(([sid, pref]) => {
        return pref.nickname === nickname.trim() &&
          !room.participants.some((p) => p.socketId === sid && p.socketId !== socket.id);
      });
      if (oldPrefEntry) {
        room.preferences[socket.id] = oldPrefEntry[1];
        delete room.preferences[oldPrefEntry[0]];
      }

      // Restore host if reconnecting with the original host's nickname and host is gone
      const hostStillPresent = room.participants.some(
        (p) => p.socketId !== socket.id && p.socketId === room.hostSocketId
      );
      if (!hostStillPresent && nickname.trim() === room.hostNickname) {
        room.hostSocketId = socket.id;
      }

      callback({ success: true, room: getPublicRoom(room) });
      io.to(roomId).emit('room-updated', getPublicRoom(room));
    }
  );

  socket.on(
    'update-settings',
    ({
      roomId,
      matchThreshold,
      requiredMatches,
      filters,
    }: {
      roomId: string;
      matchThreshold: number;
      requiredMatches?: number;
      filters: { genreId?: number; minRating?: number; yearFrom?: number; yearTo?: number; excludedCountries?: string[]; mediaType?: 'movie' | 'tv' | 'anime' };
    }) => {
      const room = getRoom(roomId);
      if (!room || room.hostSocketId !== socket.id) return;
      room.matchThreshold = matchThreshold;
      if (requiredMatches !== undefined) room.requiredMatches = requiredMatches;
      room.filters = filters;
      io.to(roomId).emit('room-updated', getPublicRoom(room));
    }
  );

  socket.on(
    'set-room-mode',
    ({ roomId, mode }: { roomId: string; mode: 'classic' | 'preference' }) => {
      const room = getRoom(roomId);
      if (!room || room.hostSocketId !== socket.id) return;
      room.mode = mode;
      room.wizardStarted = false;
      room.preferences = {};
      io.to(roomId).emit('room-updated', getPublicRoom(room));
    }
  );

  socket.on('wizard-started', ({ roomId }: { roomId: string }) => {
    const room = getRoom(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    room.wizardStarted = true;
    io.to(roomId).emit('room-updated', getPublicRoom(room));
  });

  socket.on(
    'submit-preferences',
    ({ roomId, preferences }: { roomId: string; preferences: UserPreferences }) => {
      const room = getRoom(roomId);
      if (!room) return;
      if (!room.participants.some((p) => p.socketId === socket.id)) return;
      room.preferences[socket.id] = preferences;
      io.to(roomId).emit('room-updated', getPublicRoom(room));
    }
  );

  socket.on('start-session', async ({ roomId }: { roomId: string }) => {
    const room = getRoom(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.participants.length < 2) {
      socket.emit('error', 'Нужно минимум 2 участника');
      return;
    }

    room.status = 'swiping';
    io.to(roomId).emit('room-updated', getPublicRoom(room));
    io.to(roomId).emit('loading-movies');

    try {
      let movies: Movie[];

      if (room.mode === 'preference' && Object.keys(room.preferences).length > 0) {
        const agg = aggregatePreferences(room.preferences);
        const genreIds = agg.genreIds.slice(0, 3);
        room.aggregatedFilters = { genreIds, yearFrom: agg.yearFrom, yearTo: agg.yearTo, minRating: agg.minRating };
        movies = await loadPreferenceMovies(
          genreIds,
          1,
          agg.favoriteMovieIds,
          agg.yearFrom,
          agg.yearTo,
          agg.minRating
        );
      } else {
        movies = await loadClassicMovies(
          1,
          room.filters.genreId,
          room.filters.minRating,
          room.filters.yearFrom,
          room.filters.yearTo,
          room.filters.excludedCountries,
          room.filters.mediaType
        );
      }

      const shuffled = shuffle(movies);
      room.movies = shuffled;
      room.currentPage = 1;
      io.to(roomId).emit('movies-loaded', { movies: shuffled, append: false });
    } catch (err) {
      console.error('Failed to load movies:', err);
      io.to(roomId).emit('movies-error', { message: 'Не удалось загрузить фильмы. Проверьте TMDB_API_KEY.' });
      room.status = 'lobby';
      io.to(roomId).emit('room-updated', getPublicRoom(room));
    }
  });

  socket.on('swipe', async ({ roomId, movieId, direction }: { roomId: string; movieId: number; direction: 'left' | 'right' }) => {
    const room = getRoom(roomId);
    if (!room || room.status !== 'swiping') return;

    if (direction === 'right') {
      const isMatch = recordLike(room, movieId, socket.id);
      if (isMatch) {
        const movie = room.movies.find((m) => m.id === movieId);
        // Guard against emitting the same movie twice (e.g. multiple rapid votes)
        if (movie && !room.matchedMovies.some((m) => m.id === movieId)) {
          room.matchedMovies.push(movie);
          const matchNumber = room.matchedMovies.length;
          const isComplete = matchNumber >= room.requiredMatches;
          io.to(roomId).emit('match', {
            movie,
            matchNumber,
            requiredMatches: room.requiredMatches,
            allMatches: room.matchedMovies,
            isComplete,
          });
        }
      }
    }
  });

  socket.on('load-more-movies', async ({ roomId }: { roomId: string }) => {
    const room = getRoom(roomId);
    if (!room || room.hostSocketId !== socket.id) return;

    const nextPage = room.currentPage + 1;
    let newMovies: Movie[];

    try {
      if (room.mode === 'preference' && room.aggregatedFilters) {
        const agg = room.aggregatedFilters;
        newMovies = await loadPreferenceMovies(agg.genreIds, nextPage, [], agg.yearFrom, agg.yearTo, agg.minRating);
      } else {
        newMovies = await loadClassicMovies(
          nextPage,
          room.filters.genreId,
          room.filters.minRating,
          room.filters.yearFrom,
          room.filters.yearTo,
          room.filters.excludedCountries,
          room.filters.mediaType
        );
      }

      room.movies.push(...shuffle(newMovies));
      room.currentPage = nextPage;
      io.to(roomId).emit('movies-loaded', { movies: room.movies, append: true });
    } catch (err) {
      console.error('Failed to load more movies:', err);
    }
  });

  socket.on('end-session', ({ roomId }: { roomId: string }) => {
    const room = getRoom(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    room.status = 'ended';
    io.to(roomId).emit('session-ended', { allMatches: room.matchedMovies });
    deleteRoom(roomId);
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;

    const wasHost = room.hostSocketId === socket.id;
    removeParticipant(room, socket.id);

    if (room.participants.length === 0) {
      deleteRoom(room.id);
      return;
    }

    if (wasHost) {
      room.hostSocketId = room.participants[0].socketId;
      room.hostNickname = room.participants[0].nickname;
    }

    if (room.status === 'lobby') {
      io.to(room.id).emit('room-updated', getPublicRoom(room));
    } else {
      io.to(room.id).emit('participant-left', { participants: room.participants });
    }
  });
}
