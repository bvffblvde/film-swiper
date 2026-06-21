import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerHandlers } from './handlers';
import { fetchGenreList, searchActors, fetchSampleMovies } from './tmdb';

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/genres', async (_req, res) => {
  try {
    const genres = await fetchGenreList();
    res.json(genres);
  } catch (err) {
    console.error('GET /api/genres error:', err);
    res.status(500).json({ error: 'Не удалось загрузить жанры' });
  }
});

app.get('/api/actors/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.json([]);
    return;
  }
  try {
    const actors = await searchActors(q);
    res.json(actors);
  } catch (err) {
    console.error('GET /api/actors/search error:', err);
    res.status(500).json({ error: 'Ошибка поиска актёров' });
  }
});

app.get('/api/movies/sample', async (req, res) => {
  const genresParam = String(req.query.genres || '').trim();
  const genreIds = genresParam
    ? genresParam.split(',').map(Number).filter(Boolean)
    : [];
  try {
    const movies = await fetchSampleMovies(genreIds);
    res.json(movies);
  } catch (err) {
    console.error('GET /api/movies/sample error:', err);
    res.status(500).json({ error: 'Не удалось загрузить фильмы' });
  }
});

io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
