'use client';

import { Badge, Box, Group, Stack, Text } from '@mantine/core';
import { StarIcon, UserIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { Movie } from '@/lib/types';
import styles from './MovieCard.module.scss';

interface Props {
  movie: Movie;
  style?: React.CSSProperties;
  dragHandleProps?: Record<string, unknown>;
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export function MovieCard({ movie, style, dragHandleProps }: Props) {
  return (
    <Box {...dragHandleProps} className={styles.card} style={style}>
      <Box className={styles.poster}>
        {movie.posterPath ? (
          <Image
            src={`${POSTER_BASE}${movie.posterPath}`}
            alt={movie.title}
            fill
            style={{ objectFit: 'cover' }}
            draggable={false}
            priority
          />
        ) : (
          <Box style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text c="dimmed" size="sm">Нет постера</Text>
          </Box>
        )}
        <Box className={styles.posterGradient} />
        <Badge className={styles.ratingBadge} leftSection={<StarIcon size={12} weight="fill" />}>
          {movie.rating.toFixed(1)}
        </Badge>
      </Box>

      <Box className={styles.content}>
        <Text fw={700} className={styles.title}>{movie.title}</Text>

        {movie.genres.length > 0 && (
          <Group gap={6} mb={12}>
            {movie.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="light" color="violet" size="sm" radius={6} style={{ fontSize: '11px' }}>
                {genre}
              </Badge>
            ))}
          </Group>
        )}

        <Text size="sm" c="dimmed" className={styles.overview}>
          {movie.overview || 'Описание недоступно'}
        </Text>

        {movie.actors.length > 0 && (
          <Stack gap={4}>
            <Group gap={6} align="center">
              <UserIcon size={13} color="#5c5f66" />
              <span className={styles.actorsLabel}>В главных ролях</span>
            </Group>
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
              {movie.actors.join(' · ')}
            </Text>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
