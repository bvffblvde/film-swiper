'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  CheckCircleIcon,
  CircleIcon,
  CrownIcon,
  FilmStripIcon,
  HeartIcon,
  SparkleIcon,
  TrophyIcon,
  XIcon,
} from '@phosphor-icons/react';
import { getSocket } from '@/lib/socket';
import { MatchEvent, Movie, Room, UserPreferences } from '@/lib/types';
import { RoomLobby } from '@/components/RoomLobby';
import { SwipeStack } from '@/components/SwipeStack';
import { MatchModal } from '@/components/MatchModal';
import { MatchesGallery } from '@/components/MatchesGallery';
import { PreferenceWizard } from '@/components/PreferenceWizard';

type Phase = 'nickname' | 'lobby' | 'wizard' | 'wizard-waiting' | 'loading' | 'swiping' | 'matched' | 'ended';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 860px)');

  const [phase, setPhase] = useState<Phase>('nickname');
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchEvent, setMatchEvent] = useState<MatchEvent | null>(null);
  const [matchedMovies, setMatchedMovies] = useState<Movie[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [lobbySettings, setLobbySettings] = useState({ matchThreshold: 0, requiredMatches: 1, genreId: '', minRating: 0 });
  const socketIdRef = useRef<string>('');

  useEffect(() => {
    const storedNickname = sessionStorage.getItem('fs_nickname');
    if (storedNickname) {
      setNickname(storedNickname);
      joinRoom(storedNickname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('room-updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setPhase((prev) => {
        if (updatedRoom.wizardStarted && prev === 'lobby') return 'wizard';
        return prev;
      });
    });

    socket.on('loading-movies', () => setPhase('loading'));

    socket.on('movies-loaded', ({ movies: m, append }: { movies: Movie[]; append?: boolean }) => {
      setMovies(m);
      if (!append) setCurrentIndex(0); // Only reset on initial session load, not on load-more
      setPhase('swiping');
    });

    socket.on('match', (event: MatchEvent) => {
      // Guard against old backend that may not send allMatches
      const allMatches = event.allMatches ?? (event.movie ? [event.movie] : []);
      setMatchEvent(event);
      setMatchedMovies(allMatches);

      if (event.isComplete ?? false) {
        setPhase('matched');
      } else {
        notifications.show({
          title: event.movie?.title ?? 'Совпадение!',
          message: (event.requiredMatches ?? 1) > 1
            ? `Совпадение ${event.matchNumber}/${event.requiredMatches}`
            : 'Совпадение!',
          color: 'violet',
          autoClose: 3500,
        });
      }
    });

    socket.on('session-ended', () => {
      sessionStorage.removeItem('fs_nickname');
      sessionStorage.removeItem('fs_roomId');
      setPhase('ended');
      setTimeout(() => router.push('/'), 2000);
    });

    socket.on('participant-left', ({ participants }: { participants: Room['participants'] }) => {
      setRoom((prev) => (prev ? { ...prev, participants } : prev));
    });

    socket.on('movies-error', ({ message }: { message: string }) => {
      notifications.show({ message, color: 'red', title: 'Ошибка загрузки' });
      setPhase('lobby');
    });

    return () => {
      socket.off('room-updated');
      socket.off('loading-movies');
      socket.off('movies-loaded');
      socket.off('match');
      socket.off('session-ended');
      socket.off('participant-left');
      socket.off('movies-error');
    };
  }, [router]);

  function joinRoom(nick: string) {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socketIdRef.current = socket.id || '';
    socket.once('connect', () => { socketIdRef.current = socket.id || ''; });

    socket.emit(
      'join-room',
      { roomId: id, nickname: nick.trim() },
      ({ success, error, room: r }: { success: boolean; error?: string; room?: Room }) => {
        if (!success) {
          notifications.show({ message: error || 'Ошибка входа', color: 'red' });
          return;
        }
        socketIdRef.current = socket.id || '';
        setRoom(r || null);
        if (r?.wizardStarted) {
          setPhase('wizard');
        } else {
          setPhase('lobby');
        }
      }
    );
  }

  function handleNicknameSubmit() {
    if (!nickname.trim()) {
      notifications.show({ message: 'Введите никнейм', color: 'red' });
      return;
    }
    joinRoom(nickname);
  }

  function handleStart() {
    getSocket().emit('start-session', { roomId: id });
  }

  function handleStartWizard() {
    getSocket().emit('wizard-started', { roomId: id });
    setPhase('wizard');
  }

  function handleModeChange(mode: 'classic' | 'preference') {
    getSocket().emit('set-room-mode', { roomId: id, mode });
  }

  function handleSettingsChange(settings: { matchThreshold: number; requiredMatches: number; filters: { genreId?: number; minRating?: number } }) {
    getSocket().emit('update-settings', { roomId: id, ...settings });
  }

  function handleWizardComplete(prefs: UserPreferences) {
    getSocket().emit('submit-preferences', { roomId: id, preferences: prefs });
    setPhase('wizard-waiting');
  }

  function handleSwipe(movie: Movie, direction: 'left' | 'right') {
    getSocket().emit('swipe', { roomId: id, movieId: movie.id, direction });
    setCurrentIndex((i) => i + 1);
  }

  function handleExhausted() {
    const isHost = room?.hostSocketId === socketIdRef.current;
    if (isHost) {
      getSocket().emit('load-more-movies', { roomId: id });
      setPhase('loading');
    }
  }

  function handleFinish() {
    const isHost = room?.hostSocketId === socketIdRef.current;
    if (isHost) getSocket().emit('end-session', { roomId: id });
  }

  function handleMatchContinue() {
    setPhase('swiping');
    setMatchEvent(null);
  }

  function handleMatchViewGallery() {
    setShowGallery(true);
    setPhase('swiping');
    setMatchEvent(null);
  }

  const isHost = room?.hostSocketId === socketIdRef.current;

  // ── Nickname ──────────────────────────────────────────────────────
  if (phase === 'nickname') {
    return (
      <Center style={{ minHeight: '100dvh', padding: '20px' }}>
        <Stack gap={0} style={{ width: '100%', maxWidth: '380px' }}>
          <Group gap={10} mb={40} justify="center">
            <FilmStripIcon size={32} weight="duotone" color="#845ef7" />
            <Text fw={700} style={{ fontSize: '24px', color: '#fff' }}>FilmSwiper</Text>
          </Group>
          <Paper radius={16} p={28} style={{ background: '#1A1B1E', border: '1px solid #2C2E33' }}>
            <Text fw={600} style={{ color: '#fff', marginBottom: '6px', fontSize: '18px' }}>Вход в комнату</Text>
            <Text size="sm" c="dimmed" mb={20}>
              Код: <b style={{ color: '#845ef7', letterSpacing: '2px' }}>{id}</b>
            </Text>
            <TextInput
              placeholder="Ваш никнейм"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
              size="md"
              mb={16}
              autoFocus
              styles={{ input: { background: '#25262b', border: '1px solid #373A40', color: '#fff', height: '44px' } }}
            />
            <Button fullWidth size="md" onClick={handleNicknameSubmit} style={{ height: '48px' }}>
              Войти
            </Button>
          </Paper>
        </Stack>
      </Center>
    );
  }

  // ── Lobby ─────────────────────────────────────────────────────────
  if (phase === 'lobby' && room) {
    return (
      <RoomLobby
        room={room}
        isHost={isHost}
        mySocketId={socketIdRef.current}
        onStart={handleStart}
        onStartWizard={handleStartWizard}
        onModeChange={handleModeChange}
        onSettingsChange={handleSettingsChange}
        settings={lobbySettings}
        onSettingsLocal={setLobbySettings}
      />
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────
  if (phase === 'wizard') {
    return (
      <PreferenceWizard
        nickname={nickname}
        onComplete={handleWizardComplete}
      />
    );
  }

  // ── Wizard waiting ────────────────────────────────────────────────
  if (phase === 'wizard-waiting' && room) {
    const submittedCount = room.preferencesSubmitted?.length ?? 0;
    const totalCount = room.participants.length;

    return (
      <Center style={{ minHeight: '100dvh', padding: '20px' }}>
        <Stack gap={0} style={{ width: '100%', maxWidth: '420px' }}>
          <Group gap={10} mb={32} justify="center">
            <FilmStripIcon size={28} weight="duotone" color="#845ef7" />
            <Text fw={700} style={{ fontSize: '20px', color: '#fff' }}>FilmSwiper</Text>
          </Group>

          <Box style={{ background: '#1A1B1E', border: '1px solid #2C2E33', borderRadius: '20px', padding: '28px' }}>
            <Box style={{ textAlign: 'center', marginBottom: '24px' }}>
              <SparkleIcon size={36} weight="duotone" color="#845ef7" style={{ marginBottom: '12px' }} />
              <Title order={4} style={{ color: '#fff', marginBottom: '6px' }}>Анкеты собираются</Title>
              <Text size="sm" c="dimmed">
                {submittedCount}/{totalCount} участников заполнили анкету
              </Text>
            </Box>

            <Stack gap={10} mb={24}>
              {room.participants.map((p) => {
                const submitted = room.preferencesSubmitted?.includes(p.socketId);
                return (
                  <Group key={p.socketId} gap={10} align="center">
                    <Avatar size={34} radius="xl" color="violet" style={{ fontSize: '12px', flexShrink: 0 }}>
                      {p.nickname.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Text size="sm" style={{ color: '#C1C2C5', flex: 1 }}>{p.nickname}</Text>
                    {p.socketId === room.hostSocketId && (
                      <CrownIcon size={13} weight="fill" color="#FAB005" />
                    )}
                    {submitted
                      ? <CheckCircleIcon size={18} color="#51CF66" weight="fill" />
                      : <CircleIcon size={18} color="#5c5f66" />}
                  </Group>
                );
              })}
            </Stack>

            {isHost ? (
              <Button
                fullWidth
                size="md"
                onClick={handleStart}
                leftSection={<SparkleIcon size={18} />}
                style={{ height: '48px' }}
              >
                Запустить подборку
              </Button>
            ) : (
              <Box style={{ textAlign: 'center', padding: '12px', background: '#25262b', borderRadius: '12px' }}>
                <Loader size={20} color="violet" style={{ marginBottom: '8px' }} />
                <Text size="sm" c="dimmed">Ждём пока хост запустит подборку...</Text>
              </Box>
            )}
          </Box>
        </Stack>
      </Center>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <Center style={{ minHeight: '100dvh' }}>
        <Stack align="center" gap={16}>
          <Loader size={48} color="violet" />
          <Text c="dimmed" size="lg">Загружаем фильмы...</Text>
        </Stack>
      </Center>
    );
  }

  // ── Ended ─────────────────────────────────────────────────────────
  if (phase === 'ended') {
    return (
      <Center style={{ minHeight: '100dvh' }}>
        <Stack align="center" gap={16}>
          <Text fw={700} style={{ fontSize: '24px', color: '#fff' }}>Сессия завершена</Text>
          <Text c="dimmed">Возвращаемся на главную...</Text>
        </Stack>
      </Center>
    );
  }

  // ── Swipe + Matched ───────────────────────────────────────────────
  if (phase === 'swiping' || phase === 'matched') {
    const dislikeBtn = (
      <Button
        variant="light" color="red" radius="xl"
        style={{ width: isDesktop ? '72px' : '64px', height: isDesktop ? '72px' : '64px', padding: 0 }}
        onClick={() => { const m = movies[currentIndex]; if (m) handleSwipe(m, 'left'); }}
      >
        <XIcon size={isDesktop ? 32 : 28} weight="bold" />
      </Button>
    );

    const likeBtn = (
      <Button
        variant="light" color="green" radius="xl"
        style={{ width: isDesktop ? '72px' : '64px', height: isDesktop ? '72px' : '64px', padding: 0 }}
        onClick={() => { const m = movies[currentIndex]; if (m) handleSwipe(m, 'right'); }}
      >
        <HeartIcon size={isDesktop ? 32 : 28} weight="fill" />
      </Button>
    );

    const matchesBadge = matchedMovies.length > 0 && (
      <Button
        variant="light"
        color="yellow"
        size="xs"
        radius="xl"
        leftSection={<TrophyIcon size={13} weight="fill" />}
        onClick={() => setShowGallery(true)}
        style={{ fontSize: '12px' }}
      >
        {matchedMovies.length}
        {room?.requiredMatches && room.requiredMatches > 1 ? `/${room.requiredMatches}` : ''}{' '}
        матч{matchedMovies.length === 1 ? '' : matchedMovies.length < 5 ? 'а' : 'ей'}
      </Button>
    );

    if (isDesktop) {
      return (
        <Box style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box style={{ padding: '16px 32px', borderBottom: '1px solid #2C2E33', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Group gap={10}>
              <FilmStripIcon size={26} weight="duotone" color="#845ef7" />
              <Text fw={700} style={{ color: '#fff', fontSize: '18px' }}>FilmSwiper</Text>
            </Group>
            <Group gap={12}>
              {matchesBadge}
              <Badge variant="outline" color="violet" style={{ letterSpacing: '2px', fontSize: '13px' }}>
                {id}
              </Badge>
            </Group>
          </Box>

          <Box style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <Box style={{ width: '380px', height: '580px', position: 'relative' }}>
                <SwipeStack movies={movies} currentIndex={currentIndex} onSwipe={handleSwipe} onExhausted={handleExhausted} />
              </Box>
              <Group gap={48} mt={32}>
                {dislikeBtn}
                {likeBtn}
              </Group>
            </Box>

            <Box style={{ width: '260px', borderLeft: '1px solid #2C2E33', padding: '28px 24px', flexShrink: 0, overflowY: 'auto' }}>
              <Text size="xs" c="dimmed" fw={600} style={{ textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>
                Участники ({room?.participants.length}/6)
              </Text>
              <Stack gap={14}>
                {room?.participants.map((p) => (
                  <Group key={p.socketId} gap={10} align="center">
                    <Avatar size={34} radius="xl" color="violet" style={{ fontSize: '12px', flexShrink: 0 }}>
                      {p.nickname.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Text size="sm" style={{ color: '#C1C2C5', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nickname}
                    </Text>
                    {p.socketId === room.hostSocketId && (
                      <CrownIcon size={14} weight="fill" color="#FAB005" />
                    )}
                  </Group>
                ))}
              </Stack>
            </Box>
          </Box>

          <MatchModal
            movie={matchEvent?.movie ?? null}
            opened={phase === 'matched'}
            matchNumber={matchEvent?.matchNumber ?? 1}
            requiredMatches={matchEvent?.requiredMatches ?? 1}
            isHost={isHost}
            isComplete={matchEvent?.isComplete ?? false}
            onContinue={handleMatchContinue}
            onViewGallery={handleMatchViewGallery}
          />

          <MatchesGallery
            matches={matchedMovies}
            isHost={isHost}
            opened={showGallery}
            onClose={() => setShowGallery(false)}
            onFinish={handleFinish}
          />
        </Box>
      );
    }

    return (
      <Box style={{ height: '100dvh', display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <Group justify="space-between" align="center" mb={16} style={{ flexShrink: 0 }}>
          <Group gap={8}>
            <FilmStripIcon size={22} weight="duotone" color="#845ef7" />
            <Text fw={700} style={{ color: '#fff', fontSize: '16px' }}>FilmSwiper</Text>
          </Group>
          <Group gap={8}>
            {matchesBadge}
            <Group gap={6}>
              {room?.participants.map((p) => (
                <Box
                  key={p.socketId}
                  title={p.nickname}
                  style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.socketId === room.hostSocketId ? '#845ef7' : '#51CF66' }}
                />
              ))}
            </Group>
          </Group>
        </Group>

        <Box style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <SwipeStack movies={movies} currentIndex={currentIndex} onSwipe={handleSwipe} onExhausted={handleExhausted} />
        </Box>

        <Group justify="center" gap={32} mt={20} style={{ flexShrink: 0 }}>
          {dislikeBtn}
          {likeBtn}
        </Group>

        <MatchModal
          movie={matchEvent?.movie ?? null}
          opened={phase === 'matched'}
          matchNumber={matchEvent?.matchNumber ?? 1}
          requiredMatches={matchEvent?.requiredMatches ?? 1}
          isHost={isHost}
          isComplete={matchEvent?.isComplete ?? false}
          onContinue={handleMatchContinue}
          onViewGallery={handleMatchViewGallery}
        />

        <MatchesGallery
          matches={matchedMovies}
          isHost={isHost}
          opened={showGallery}
          onClose={() => setShowGallery(false)}
          onFinish={handleFinish}
        />
      </Box>
    );
  }

  return null;
}
