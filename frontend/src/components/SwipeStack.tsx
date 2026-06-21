'use client';

import { useCallback, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Box, Text } from '@mantine/core';
import { HeartIcon, XIcon } from '@phosphor-icons/react';
import { Movie } from '@/lib/types';
import { MovieCard } from './MovieCard';

interface Props {
  movies: Movie[];
  currentIndex: number;
  onSwipe: (movie: Movie, direction: 'left' | 'right') => void;
  onExhausted: () => void;
}

function DraggableCard({
  movie,
  onSwipe,
  isTop,
  zIndex,
  scale,
  translateY,
}: {
  movie: Movie;
  onSwipe: (movie: Movie, direction: 'left' | 'right') => void;
  isTop: boolean;
  zIndex: number;
  scale: number;
  translateY: number;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, -20], [1, 0]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number } }) => {
      const threshold = 100;
      if (info.offset.x > threshold) {
        onSwipe(movie, 'right');
      } else if (info.offset.x < -threshold) {
        onSwipe(movie, 'left');
      }
    },
    [movie, onSwipe]
  );

  return (
    <motion.div
      key={movie.id}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        x,
        rotate,
        scale,
        translateY,
        zIndex,
        touchAction: isTop ? 'none' : 'auto',
      }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      animate={{ scale, translateY }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* LIKE indicator */}
      {isTop && (
        <motion.div
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            zIndex: 10,
            opacity: likeOpacity,
            transform: 'rotate(-15deg)',
            border: '3px solid #51CF66',
            borderRadius: '8px',
            padding: '4px 12px',
            pointerEvents: 'none',
          }}
        >
          <Text fw={900} style={{ fontSize: '22px', color: '#51CF66', letterSpacing: '1px' }}>
            <HeartIcon size={20} weight="fill" style={{ marginRight: '4px' }} />
            ЛАЙК
          </Text>
        </motion.div>
      )}

      {/* NOPE indicator */}
      {isTop && (
        <motion.div
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            zIndex: 10,
            opacity: nopeOpacity,
            transform: 'rotate(15deg)',
            border: '3px solid #FF6B6B',
            borderRadius: '8px',
            padding: '4px 12px',
            pointerEvents: 'none',
          }}
        >
          <Text fw={900} style={{ fontSize: '22px', color: '#FF6B6B', letterSpacing: '1px' }}>
            <XIcon size={20} weight="bold" style={{ marginRight: '4px' }} />
            НОПЕ
          </Text>
        </motion.div>
      )}

      <MovieCard movie={movie} />
    </motion.div>
  );
}

export function SwipeStack({ movies, currentIndex, onSwipe, onExhausted }: Props) {
  const [leaving, setLeaving] = useState<{ movie: Movie; direction: 'left' | 'right' } | null>(null);

  const visibleMovies = movies.slice(currentIndex, currentIndex + 3);

  const handleSwipe = useCallback(
    (movie: Movie, direction: 'left' | 'right') => {
      setLeaving({ movie, direction });
      setTimeout(() => {
        setLeaving(null);
        onSwipe(movie, direction);
        if (currentIndex + 1 >= movies.length) {
          onExhausted();
        }
      }, 300);
    },
    [currentIndex, movies.length, onSwipe, onExhausted]
  );

  return (
    <Box style={{ position: 'relative', width: '100%', height: '100%' }}>
      <AnimatePresence>
        {visibleMovies.map((movie, i) => {
          const isTop = i === 0;
          const isLeaving = leaving?.movie.id === movie.id;

          return (
            <motion.div
              key={movie.id}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
              }}
              exit={
                isLeaving
                  ? {
                      x: leaving.direction === 'right' ? 500 : -500,
                      opacity: 0,
                      transition: { duration: 0.3 },
                    }
                  : {}
              }
            >
              <DraggableCard
                movie={movie}
                onSwipe={handleSwipe}
                isTop={isTop && !leaving}
                zIndex={visibleMovies.length - i}
                scale={1 - i * 0.04}
                translateY={i * 10}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {visibleMovies.length === 0 && (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <Text c="dimmed">Загружаем ещё фильмы...</Text>
        </Box>
      )}
    </Box>
  );
}
