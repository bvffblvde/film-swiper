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
  fetchMovieCredits,
  fetchMoviesWithFilters,
  fetchMovieWithCredits,
} from './tmdb';

async function buildMoviesFromRaw(
  raw: { id: number; title: string; overview: string; poster_path: string | null; vote_average: number; genre_ids: number[] }[],
  genreMap: Record<number, string>
): Promise<Movie[]> {
  return Promise.all(
    raw.map(async (m) => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      posterPath: m.poster_path,
      rating: Math.round(m.vote_average * 10) / 10,
      genres: m.genre_ids.map((id) => genreMap[id]).filter(Boolean),
      actors: await fetchMovieCredits(m.id).catch(() => []),
    }))
  );
}

async function loadClassicMovies(
  page: number,
  genreId?: number,
  minRating?: number
): Promise<Movie[]> {
  const [{ movies: raw }, genreMap] = await Promise.all([
    fetchMovies(page, genreId, minRating),
    fetchGenres(),
  ]);
  return buildMoviesFromRaw(raw, genreMap);
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
      callback({ success: true, room: getPublicRoom(room) });
      io.to(roomId).emit('room-updated', getPublicRoom(room));
    }
  );

  socket.on(
    'update-settings',
    ({
      roomId,
      matchThreshold,
      filters,
    }: {
      roomId: string;
      matchThreshold: number;
      filters: { genreId?: number; minRating?: number };
    }) => {
      const room = getRoom(roomId);
      if (!room || room.hostSocketId !== socket.id) return;
      room.matchThreshold = matchThreshold;
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
        movies = await loadClassicMovies(1, room.filters.genreId, room.filters.minRating);
      }

      room.movies = movies;
      room.currentPage = 1;
      io.to(roomId).emit('movies-loaded', { movies });
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
        if (movie) {
          room.matchedMovie = movie;
          io.to(roomId).emit('match', { movie });
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
        newMovies = await loadClassicMovies(nextPage, room.filters.genreId, room.filters.minRating);
      }

      room.movies.push(...newMovies);
      room.currentPage = nextPage;
      io.to(roomId).emit('movies-loaded', { movies: room.movies });
    } catch (err) {
      console.error('Failed to load more movies:', err);
    }
  });

  socket.on('end-session', ({ roomId }: { roomId: string }) => {
    const room = getRoom(roomId);
    if (!room || room.hostSocketId !== socket.id) return;
    room.status = 'ended';
    io.to(roomId).emit('session-ended');
    deleteRoom(roomId);
  });

  socket.on('disconnect', () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;

    removeParticipant(room, socket.id);

    if (room.participants.length === 0) {
      deleteRoom(room.id);
      return;
    }

    if (room.hostSocketId === socket.id) {
      room.hostSocketId = room.participants[0].socketId;
    }

    if (room.status === 'lobby') {
      io.to(room.id).emit('room-updated', getPublicRoom(room));
    } else {
      io.to(room.id).emit('participant-left', { participants: room.participants });
    }
  });
}
