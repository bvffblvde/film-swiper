'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { getSocket } from '@/lib/socket';
import { MatchEvent, Movie, Room, UserPreferences } from '@/lib/types';

export type Phase =
  | 'nickname'
  | 'lobby'
  | 'wizard'
  | 'wizard-waiting'
  | 'loading'
  | 'swiping'
  | 'matched'
  | 'ended';

export type LobbySettings = {
  matchThreshold: number;
  requiredMatches: number;
  genreId: string;
  minRating: number;
  yearFrom: number;
  yearTo: number;
  excludedCountries: string[];
};

export function useRoom(roomId: string) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('nickname');
  const [nickname, setNickname] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchEvent, setMatchEvent] = useState<MatchEvent | null>(null);
  const [matchedMovies, setMatchedMovies] = useState<Movie[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [infoMovie, setInfoMovie] = useState<Movie | null>(null);
  const [lobbySettings, setLobbySettings] = useState<LobbySettings>({
    matchThreshold: 0,
    requiredMatches: 1,
    genreId: '',
    minRating: 0,
    yearFrom: 0,
    yearTo: 0,
    excludedCountries: [],
  });

  const socketIdRef = useRef<string>('');
  const loadingMoreRef = useRef(false);

  // Restore session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('fs_nickname');
    if (stored) {
      setNickname(stored);
      joinRoom(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Socket event subscriptions
  useEffect(() => {
    const socket = getSocket();

    socket.on('room-updated', (updated: Room) => {
      setRoom(updated);
      setPhase((prev) => {
        if (updated.wizardStarted && prev === 'lobby') return 'wizard';
        return prev;
      });
    });

    socket.on('loading-movies', () => setPhase('loading'));

    socket.on('movies-loaded', ({ movies: m, append }: { movies: Movie[]; append?: boolean }) => {
      loadingMoreRef.current = false;
      setMovies(m);
      if (!append) setCurrentIndex(0);
      setPhase('swiping');
    });

    socket.on('match', (event: MatchEvent) => {
      const allMatches = event.allMatches ?? (event.movie ? [event.movie] : []);
      setMatchEvent(event);
      setMatchedMovies(allMatches);

      if (event.isComplete ?? false) {
        setPhase('matched');
      } else {
        notifications.show({
          title: event.movie?.title ?? 'Совпадение!',
          message:
            (event.requiredMatches ?? 1) > 1
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

  // ── Actions ──────────────────────────────────────────────────────────

  function joinRoom(nick: string) {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    socketIdRef.current = socket.id || '';
    socket.once('connect', () => {
      socketIdRef.current = socket.id || '';
    });

    socket.emit(
      'join-room',
      { roomId, nickname: nick.trim() },
      ({ success, error, room: r }: { success: boolean; error?: string; room?: Room }) => {
        if (!success) {
          notifications.show({ message: error || 'Ошибка входа', color: 'red' });
          return;
        }
        socketIdRef.current = socket.id || '';
        setRoom(r || null);
        setPhase(r?.wizardStarted ? 'wizard' : 'lobby');
      }
    );
  }

  function handleNicknameSubmit() {
    if (!nickname.trim()) {
      notifications.show({ message: 'Введите никнейм', color: 'red' });
      return;
    }
    sessionStorage.setItem('fs_nickname', nickname);
    joinRoom(nickname);
  }

  function handleStart() {
    getSocket().emit('start-session', { roomId });
  }

  function handleStartWizard() {
    getSocket().emit('wizard-started', { roomId });
    setPhase('wizard');
  }

  function handleModeChange(mode: 'classic' | 'preference') {
    getSocket().emit('set-room-mode', { roomId, mode });
  }

  function handleSettingsChange(settings: {
    matchThreshold: number;
    requiredMatches: number;
    filters: {
      genreId?: number;
      minRating?: number;
      yearFrom?: number;
      yearTo?: number;
      excludedCountries?: string[];
    };
  }) {
    getSocket().emit('update-settings', { roomId, ...settings });
  }

  function handleWizardComplete(prefs: UserPreferences) {
    getSocket().emit('submit-preferences', { roomId, preferences: prefs });
    setPhase('wizard-waiting');
  }

  function handleExhausted() {
    if (loadingMoreRef.current) return;
    const isHost = room?.hostSocketId === socketIdRef.current;
    if (isHost) {
      loadingMoreRef.current = true;
      getSocket().emit('load-more-movies', { roomId });
      setPhase('loading');
    }
  }

  function handleSwipe(movie: Movie, direction: 'left' | 'right') {
    getSocket().emit('swipe', { roomId, movieId: movie.id, direction });
    setCurrentIndex((i) => i + 1);
    if (currentIndex + 1 >= movies.length) {
      handleExhausted();
    }
  }

  function handleFinish() {
    if (room?.hostSocketId === socketIdRef.current) {
      getSocket().emit('end-session', { roomId });
    }
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

  return {
    phase,
    nickname,
    setNickname,
    room,
    movies,
    currentIndex,
    matchEvent,
    matchedMovies,
    showGallery,
    setShowGallery,
    infoMovie,
    setInfoMovie,
    lobbySettings,
    setLobbySettings,
    isHost,
    handleNicknameSubmit,
    handleStart,
    handleStartWizard,
    handleModeChange,
    handleSettingsChange,
    handleWizardComplete,
    handleSwipe,
    handleExhausted,
    handleFinish,
    handleMatchContinue,
    handleMatchViewGallery,
  };
}
