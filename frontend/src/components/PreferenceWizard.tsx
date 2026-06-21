'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  RangeSlider,
  Slider,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  MagnifyingGlassIcon,
  XIcon,
  CheckIcon,
  FilmStripIcon,
  StarIcon,
  UserIcon,
  CalendarIcon,
} from '@phosphor-icons/react';
import Image from 'next/image';
import { ActorItem, FavoriteMovieItem, GenreItem, SampleMovie, UserPreferences } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const IMG = 'https://image.tmdb.org/t/p/w185';

interface Props {
  nickname: string;
  onComplete: (prefs: UserPreferences) => void;
}

const STEP_LABELS = ['Привет', 'Актёры', 'Жанры', 'Фильмы', 'Даты'];

export function PreferenceWizard({ nickname, onComplete }: Props) {
  const [step, setStep] = useState(1);

  // Step 2 – actors
  const [actorQuery, setActorQuery] = useState('');
  const [actorResults, setActorResults] = useState<ActorItem[]>([]);
  const [actorLoading, setActorLoading] = useState(false);
  const [selectedActors, setSelectedActors] = useState<ActorItem[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 3 – genres
  const [allGenres, setAllGenres] = useState<GenreItem[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<GenreItem[]>([]);

  // Step 4 – movies
  const [sampleMovies, setSampleMovies] = useState<SampleMovie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState<FavoriteMovieItem[]>([]);

  // Step 5 – year + rating
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2025]);
  const [skipYear, setSkipYear] = useState(true);
  const [minRating, setMinRating] = useState(0);

  // ── Debounced actor search ────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!actorQuery.trim()) { setActorResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setActorLoading(true);
      try {
        const res = await fetch(`${API}/api/actors/search?q=${encodeURIComponent(actorQuery)}`);
        setActorResults(await res.json());
      } catch { setActorResults([]); }
      setActorLoading(false);
    }, 400);
  }, [actorQuery]);

  // ── Load genres when entering step 3 ──────────────────────────────
  useEffect(() => {
    if (step !== 3 || allGenres.length > 0) return;
    setGenresLoading(true);
    fetch(`${API}/api/genres`)
      .then((r) => r.json())
      .then((g) => setAllGenres(g))
      .catch(() => {})
      .finally(() => setGenresLoading(false));
  }, [step, allGenres.length]);

  // ── Load sample movies when entering step 4 ───────────────────────
  useEffect(() => {
    if (step !== 4) return;
    setMoviesLoading(true);
    const ids = selectedGenres.map((g) => g.id).join(',');
    fetch(`${API}/api/movies/sample${ids ? `?genres=${ids}` : ''}`)
      .then((r) => r.json())
      .then((m) => setSampleMovies(m))
      .catch(() => {})
      .finally(() => setMoviesLoading(false));
  }, [step, selectedGenres]);

  // ── Actor helpers ──────────────────────────────────────────────────
  const toggleActor = useCallback((actor: ActorItem) => {
    setSelectedActors((prev) => {
      const exists = prev.some((a) => a.id === actor.id);
      if (exists) return prev.filter((a) => a.id !== actor.id);
      if (prev.length >= 5) return prev;
      return [...prev, actor];
    });
  }, []);

  // ── Genre helpers ─────────────────────────────────────────────────
  const toggleGenre = useCallback((genre: GenreItem) => {
    setSelectedGenres((prev) => {
      const exists = prev.some((g) => g.id === genre.id);
      if (exists) return prev.filter((g) => g.id !== genre.id);
      if (prev.length >= 3) return prev;
      return [...prev, genre];
    });
  }, []);

  // ── Movie helpers ─────────────────────────────────────────────────
  const toggleMovie = useCallback((movie: SampleMovie) => {
    setSelectedMovies((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      if (exists) return prev.filter((m) => m.id !== movie.id);
      if (prev.length >= 5) return prev;
      return [...prev, { id: movie.id, title: movie.title, posterPath: movie.posterPath }];
    });
  }, []);

  // ── Navigation ────────────────────────────────────────────────────
  function canNext(): boolean {
    if (step === 3) return selectedGenres.length >= 1;
    return true;
  }

  function handleNext() {
    if (step === 5) {
      onComplete({
        nickname,
        actors: selectedActors,
        genres: selectedGenres,
        favoriteMovies: selectedMovies,
        yearFrom: skipYear ? undefined : yearRange[0],
        yearTo: skipYear ? undefined : yearRange[1],
        minRating: minRating > 0 ? minRating : undefined,
      });
    } else {
      setStep((s) => s + 1);
    }
  }

  // ── Layout helpers ────────────────────────────────────────────────
  const card = {
    background: '#1A1B1E',
    border: '1px solid #2C2E33',
    borderRadius: '16px',
    padding: '20px',
  } as const;

  // ── Step progress bar ─────────────────────────────────────────────
  const progress = (
    <Group gap={6} justify="center" mb={32}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <Box key={n} style={{ textAlign: 'center' }}>
            <Box
              style={{
                width: active ? '36px' : '28px',
                height: '28px',
                borderRadius: '50px',
                background: done ? '#845ef7' : active ? '#845ef7' : '#2C2E33',
                border: active ? '2px solid #9775fa' : done ? 'none' : '2px solid #373A40',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                margin: '0 auto 4px',
              }}
            >
              {done ? (
                <CheckIcon size={13} weight="bold" color="#fff" />
              ) : (
                <Text style={{ fontSize: '12px', fontWeight: 700, color: active ? '#fff' : '#5c5f66' }}>{n}</Text>
              )}
            </Box>
            <Text style={{ fontSize: '10px', color: active ? '#9775fa' : done ? '#845ef7' : '#5c5f66', whiteSpace: 'nowrap' }}>
              {label}
            </Text>
          </Box>
        );
      })}
    </Group>
  );

  const navButtons = (
    <Group justify={step > 1 ? 'space-between' : 'flex-end'} mt={24}>
      {step > 1 && (
        <Button variant="subtle" color="gray" onClick={() => setStep((s) => s - 1)}>
          Назад
        </Button>
      )}
      <Button
        onClick={handleNext}
        disabled={!canNext()}
        style={{ minWidth: '120px' }}
      >
        {step === 5 ? 'Готово' : 'Далее'}
      </Button>
    </Group>
  );

  // ── STEP 1: Welcome ───────────────────────────────────────────────
  if (step === 1) {
    return (
      <WizardShell progress={progress}>
        <Box style={{ textAlign: 'center', padding: '20px 0' }}>
          <FilmStripIcon size={56} weight="duotone" color="#845ef7" style={{ marginBottom: '20px' }} />
          <Title order={2} style={{ color: '#fff', marginBottom: '12px' }}>
            Привет, {nickname}!
          </Title>
          <Text c="dimmed" size="sm" style={{ maxWidth: '320px', margin: '0 auto', lineHeight: 1.6 }}>
            Пройди короткий опрос — и мы подберём фильмы с учётом вкусов всех участников.
          </Text>
          <Text c="dimmed" size="xs" mt={8}>Займёт около 2 минут</Text>
        </Box>
        <Box mt={32}>{navButtons}</Box>
      </WizardShell>
    );
  }

  // ── STEP 2: Actors ────────────────────────────────────────────────
  if (step === 2) {
    return (
      <WizardShell progress={progress}>
        <Stack gap={16}>
          <Box>
            <Title order={4} style={{ color: '#fff', marginBottom: '4px' }}>Любимые актёры</Title>
            <Text size="sm" c="dimmed">Выберите до 5 актёров (необязательно)</Text>
          </Box>

          <TextInput
            placeholder="Поиск актёра..."
            value={actorQuery}
            onChange={(e) => setActorQuery(e.target.value)}
            leftSection={actorLoading ? <Loader size={14} color="violet" /> : <MagnifyingGlassIcon size={16} color="#5c5f66" />}
            styles={{ input: { background: '#25262b', border: '1px solid #373A40', color: '#fff' } }}
          />

          {actorResults.length > 0 && (
            <Box style={{ ...card, maxHeight: '200px', overflowY: 'auto' }}>
              <Stack gap={8}>
                {actorResults.map((actor) => {
                  const sel = selectedActors.some((a) => a.id === actor.id);
                  return (
                    <Group
                      key={actor.id}
                      gap={10}
                      align="center"
                      style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', background: sel ? 'rgba(132,94,247,0.15)' : 'transparent' }}
                      onClick={() => toggleActor(actor)}
                    >
                      <Box
                        style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#2C2E33', position: 'relative' }}
                      >
                        {actor.profilePath ? (
                          <Image src={`${IMG}${actor.profilePath}`} alt={actor.name} fill style={{ objectFit: 'cover' }} />
                        ) : (
                          <Box style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserIcon size={18} color="#5c5f66" />
                          </Box>
                        )}
                      </Box>
                      <Text size="sm" style={{ color: sel ? '#9775fa' : '#C1C2C5', flex: 1 }}>{actor.name}</Text>
                      {sel && <CheckIcon size={16} color="#845ef7" weight="bold" />}
                    </Group>
                  );
                })}
              </Stack>
            </Box>
          )}

          {selectedActors.length > 0 && (
            <Box>
              <Text size="xs" c="dimmed" mb={8}>Выбрано ({selectedActors.length}/5):</Text>
              <Group gap={8} wrap="wrap">
                {selectedActors.map((a) => (
                  <Badge
                    key={a.id}
                    variant="light"
                    color="violet"
                    rightSection={
                      <XIcon
                        size={12}
                        weight="bold"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActor(a)}
                      />
                    }
                  >
                    {a.name}
                  </Badge>
                ))}
              </Group>
            </Box>
          )}
        </Stack>
        {navButtons}
      </WizardShell>
    );
  }

  // ── STEP 3: Genres ────────────────────────────────────────────────
  if (step === 3) {
    return (
      <WizardShell progress={progress}>
        <Stack gap={16}>
          <Box>
            <Title order={4} style={{ color: '#fff', marginBottom: '4px' }}>Любимые жанры</Title>
            <Text size="sm" c="dimmed">Выберите от 1 до 3 жанров</Text>
          </Box>

          {genresLoading ? (
            <Box style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader color="violet" />
            </Box>
          ) : (
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '8px',
                maxHeight: '320px',
                overflowY: 'auto',
              }}
            >
              {allGenres.map((genre) => {
                const sel = selectedGenres.some((g) => g.id === genre.id);
                const disabled = !sel && selectedGenres.length >= 3;
                return (
                  <Box
                    key={genre.id}
                    onClick={() => !disabled && toggleGenre(genre)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: sel ? '2px solid #845ef7' : '2px solid #2C2E33',
                      background: sel ? 'rgba(132,94,247,0.15)' : '#1A1B1E',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    <Text size="sm" style={{ color: sel ? '#9775fa' : '#C1C2C5', fontWeight: sel ? 600 : 400 }}>
                      {genre.name}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}

          {selectedGenres.length > 0 && (
            <Group gap={6}>
              {selectedGenres.map((g) => (
                <Badge key={g.id} variant="filled" color="violet" size="sm">{g.name}</Badge>
              ))}
            </Group>
          )}
        </Stack>
        {navButtons}
      </WizardShell>
    );
  }

  // ── STEP 4: Favorite movies ───────────────────────────────────────
  if (step === 4) {
    return (
      <WizardShell progress={progress}>
        <Stack gap={16}>
          <Box>
            <Title order={4} style={{ color: '#fff', marginBottom: '4px' }}>Любимые фильмы</Title>
            <Text size="sm" c="dimmed">Выберите до 5 фильмов (необязательно)</Text>
          </Box>

          {moviesLoading ? (
            <Box style={{ textAlign: 'center', padding: '40px 0' }}>
              <Loader color="violet" />
            </Box>
          ) : (
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                maxHeight: '360px',
                overflowY: 'auto',
              }}
            >
              {sampleMovies.map((movie) => {
                const sel = selectedMovies.some((m) => m.id === movie.id);
                const disabled = !sel && selectedMovies.length >= 5;
                return (
                  <Box
                    key={movie.id}
                    onClick={() => !disabled && toggleMovie(movie)}
                    style={{
                      position: 'relative',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      aspectRatio: '2/3',
                      background: '#25262b',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      border: sel ? '2px solid #845ef7' : '2px solid transparent',
                      opacity: disabled ? 0.4 : 1,
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {movie.posterPath ? (
                      <Image
                        src={`${IMG}${movie.posterPath}`}
                        alt={movie.title}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FilmStripIcon size={24} color="#5c5f66" />
                      </Box>
                    )}
                    <Box
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: sel
                          ? 'rgba(132,94,247,0.5)'
                          : 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                      }}
                    />
                    {sel && (
                      <Box
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%,-50%)',
                          background: '#845ef7',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckIcon size={16} weight="bold" color="#fff" />
                      </Box>
                    )}
                    <Text
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        left: '6px',
                        right: '6px',
                        fontSize: '10px',
                        color: '#fff',
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}
                    >
                      {movie.title}
                    </Text>
                    <Badge
                      leftSection={<StarIcon size={9} weight="fill" />}
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'rgba(0,0,0,0.75)',
                        color: '#FAB005',
                      }}
                    >
                      {movie.rating.toFixed(1)}
                    </Badge>
                  </Box>
                );
              })}
            </Box>
          )}

          {selectedMovies.length > 0 && (
            <Text size="xs" c="dimmed">Выбрано: {selectedMovies.length}/5</Text>
          )}
        </Stack>
        {navButtons}
      </WizardShell>
    );
  }

  // ── STEP 5: Year + Rating ─────────────────────────────────────────
  return (
    <WizardShell progress={progress}>
      <Stack gap={24}>
        <Box>
          <Title order={4} style={{ color: '#fff', marginBottom: '4px' }}>Дополнительные фильтры</Title>
          <Text size="sm" c="dimmed">Необязательно — можно пропустить</Text>
        </Box>

        <Box style={card}>
          <Group gap={8} align="center" mb={16}>
            <CalendarIcon size={16} color="#845ef7" />
            <Text size="sm" fw={500} style={{ color: '#C1C2C5' }}>Год выпуска</Text>
            {!skipYear && (
              <Badge variant="light" color="violet" size="sm">{yearRange[0]} — {yearRange[1]}</Badge>
            )}
          </Group>
          {skipYear ? (
            <Button
              variant="light"
              color="violet"
              size="xs"
              onClick={() => setSkipYear(false)}
            >
              Добавить фильтр по году
            </Button>
          ) : (
            <Stack gap={10}>
              <RangeSlider
                min={1950}
                max={2025}
                step={1}
                value={yearRange}
                onChange={setYearRange}
                color="violet"
                minRange={1}
                marks={[
                  { value: 1950, label: '1950' },
                  { value: 1990, label: '1990' },
                  { value: 2025, label: '2025' },
                ]}
                styles={{ markLabel: { fontSize: '11px', color: '#5c5f66' } }}
              />
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => { setSkipYear(true); setYearRange([1990, 2025]); }}
                style={{ alignSelf: 'flex-start' }}
              >
                Сбросить
              </Button>
            </Stack>
          )}
        </Box>

        <Box style={card}>
          <Group gap={8} align="center" mb={16}>
            <StarIcon size={16} color="#FAB005" weight="fill" />
            <Text size="sm" fw={500} style={{ color: '#C1C2C5' }}>Минимальный рейтинг</Text>
            {minRating > 0 && (
              <Badge variant="light" color="yellow" size="sm">{minRating.toFixed(1)}+</Badge>
            )}
          </Group>
          <Slider
            min={0}
            max={9}
            step={0.5}
            value={minRating}
            onChange={setMinRating}
            color="violet"
            marks={[
              { value: 0, label: 'Любой' },
              { value: 5, label: '5.0' },
              { value: 9, label: '9.0' },
            ]}
            styles={{ markLabel: { fontSize: '11px', color: '#5c5f66' } }}
          />
        </Box>
      </Stack>
      {navButtons}
    </WizardShell>
  );
}

function WizardShell({
  children,
  progress,
}: {
  children: React.ReactNode;
  progress: React.ReactNode;
}) {
  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Box style={{ width: '100%', maxWidth: '480px' }}>
        {progress}
        <Box
          style={{
            background: '#1A1B1E',
            border: '1px solid #2C2E33',
            borderRadius: '20px',
            padding: '28px',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
