'use client';

import { Avatar, Badge, Button, Group, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  CrownIcon,
  FilmStripIcon,
  HeartIcon,
  TrophyIcon,
  XIcon,
} from '@phosphor-icons/react';
import { MatchEvent, Movie, Room } from '@/lib/types';
import { SwipeStack } from '@/components/SwipeStack';
import { MatchModal } from '@/components/MatchModal';
import { MatchesGallery } from '@/components/MatchesGallery';
import { MovieDetailModal } from '@/components/MovieDetailModal';
import styles from './SwipingView.module.scss';

interface Props {
  roomId: string;
  room: Room;
  phase: 'swiping' | 'matched';
  movies: Movie[];
  currentIndex: number;
  matchEvent: MatchEvent | null;
  matchedMovies: Movie[];
  showGallery: boolean;
  onGalleryChange: (v: boolean) => void;
  infoMovie: Movie | null;
  onInfoChange: (m: Movie | null) => void;
  isHost: boolean;
  onSwipe: (movie: Movie, dir: 'left' | 'right') => void;
  onExhausted: () => void;
  onFinish: () => void;
  onMatchContinue: () => void;
  onMatchViewGallery: () => void;
}

export function SwipingView({
  roomId,
  room,
  phase,
  movies,
  currentIndex,
  matchEvent,
  matchedMovies,
  showGallery,
  onGalleryChange,
  infoMovie,
  onInfoChange,
  isHost,
  onSwipe,
  onExhausted,
  onFinish,
  onMatchContinue,
  onMatchViewGallery,
}: Props) {
  const isDesktop = useMediaQuery('(min-width: 860px)');
  const current = movies[currentIndex];

  const dislikeBtn = (
    <Button
      variant="light"
      color="red"
      radius="xl"
      style={{ width: isDesktop ? '72px' : '64px', height: isDesktop ? '72px' : '64px', padding: 0 }}
      onClick={() => current && onSwipe(current, 'left')}
    >
      <XIcon size={isDesktop ? 32 : 28} weight="bold" />
    </Button>
  );

  const likeBtn = (
    <Button
      variant="light"
      color="green"
      radius="xl"
      style={{ width: isDesktop ? '72px' : '64px', height: isDesktop ? '72px' : '64px', padding: 0 }}
      onClick={() => current && onSwipe(current, 'right')}
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
      onClick={() => onGalleryChange(true)}
      style={{ fontSize: '12px' }}
    >
      {matchedMovies.length}
      {room.requiredMatches > 1 ? `/${room.requiredMatches}` : ''}{' '}
      матч{matchedMovies.length === 1 ? '' : matchedMovies.length < 5 ? 'а' : 'ей'}
    </Button>
  );

  const modals = (
    <>
      <MatchModal
        movie={matchEvent?.movie ?? null}
        opened={phase === 'matched'}
        matchNumber={matchEvent?.matchNumber ?? 1}
        requiredMatches={matchEvent?.requiredMatches ?? 1}
        isHost={isHost}
        isComplete={matchEvent?.isComplete ?? false}
        onContinue={onMatchContinue}
        onViewGallery={onMatchViewGallery}
      />
      <MatchesGallery
        matches={matchedMovies}
        isHost={isHost}
        opened={showGallery}
        onClose={() => onGalleryChange(false)}
        onFinish={onFinish}
      />
      <MovieDetailModal
        movie={infoMovie}
        opened={infoMovie !== null}
        onClose={() => onInfoChange(null)}
      />
    </>
  );

  if (isDesktop) {
    return (
      <div className={styles.root}>
        <header className={styles.header}>
          <div className={styles.logo}>
            <FilmStripIcon size={26} weight="duotone" color="var(--c-violet)" />
            <span className={styles.logoText}>FilmSwiper</span>
          </div>
          <Group gap={12}>
            {matchesBadge}
            <Badge variant="outline" color="violet" style={{ letterSpacing: '2px', fontSize: '13px' }}>
              {roomId}
            </Badge>
          </Group>
        </header>

        <div className={styles.body}>
          <div className={styles.main}>
            <div className={styles.stackWrapper}>
              <SwipeStack
                movies={movies}
                currentIndex={currentIndex}
                onSwipe={onSwipe}
                onExhausted={onExhausted}
                onInfo={onInfoChange}
              />
            </div>
            <Group gap={48} mt={32}>
              {dislikeBtn}
              {likeBtn}
            </Group>
          </div>

          <aside className={styles.sidebar}>
            <p className={styles.sidebarLabel}>Участники ({room.participants.length}/6)</p>
            <Stack gap={14}>
              {room.participants.map((p) => (
                <Group key={p.socketId} gap={10} align="center">
                  <Avatar size={34} radius="xl" color="violet" style={{ fontSize: '12px', flexShrink: 0 }}>
                    {p.nickname.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Text size="sm" className={styles.participant}>{p.nickname}</Text>
                  {p.socketId === room.hostSocketId && (
                    <CrownIcon size={14} weight="fill" color="var(--c-yellow)" />
                  )}
                </Group>
              ))}
            </Stack>
          </aside>
        </div>

        {modals}
      </div>
    );
  }

  // Mobile
  return (
    <div className={styles.rootMobile}>
      <div className={styles.headerMobile}>
        <div className={styles.logoMobile}>
          <FilmStripIcon size={22} weight="duotone" color="var(--c-violet)" />
          <span className={styles.logoTextMobile}>FilmSwiper</span>
        </div>
        <Group gap={8}>
          {matchesBadge}
          <Group gap={6}>
            {room.participants.map((p) => (
              <span
                key={p.socketId}
                className={styles.dot}
                title={p.nickname}
                style={{ background: p.socketId === room.hostSocketId ? 'var(--c-violet)' : 'var(--c-green)' }}
              />
            ))}
          </Group>
        </Group>
      </div>

      <div className={styles.stackArea}>
        <SwipeStack
          movies={movies}
          currentIndex={currentIndex}
          onSwipe={onSwipe}
          onExhausted={onExhausted}
          onInfo={onInfoChange}
        />
      </div>

      <Group justify="center" gap={32} mt={20} style={{ flexShrink: 0 }}>
        {dislikeBtn}
        {likeBtn}
      </Group>

      {modals}
    </div>
  );
}
