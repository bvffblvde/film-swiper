'use client';

import { Badge, Box, Group, Stack, Text } from '@mantine/core';
import { StarIcon, UserIcon } from '@phosphor-icons/react';
import { Movie } from '@/lib/types';
import Image from 'next/image';

interface Props {
  movie: Movie;
  style?: React.CSSProperties;
  dragHandleProps?: Record<string, unknown>;
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export function MovieCard({ movie, style, dragHandleProps }: Props) {
  return (
    <Box
      {...dragHandleProps}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
        background: '#1A1B1E',
        border: '1px solid #2C2E33',
        cursor: 'grab',
        ...style,
      }}
    >
      {/* Poster */}
      <Box style={{ position: 'relative', height: '55%', background: '#25262b' }}>
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
          <Box
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#25262b',
            }}
          >
            <Text c="dimmed" size="sm">Нет постера</Text>
          </Box>
        )}
        {/* Gradient overlay */}
        <Box
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '120px',
            background: 'linear-gradient(to top, #1A1B1E, transparent)',
          }}
        />
        {/* Rating badge */}
        <Badge
          leftSection={<StarIcon size={12} weight="fill" />}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0,0,0,0.75)',
            color: '#FAB005',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(250,176,5,0.3)',
            fontSize: '13px',
            fontWeight: 700,
            padding: '4px 10px',
          }}
        >
          {movie.rating.toFixed(1)}
        </Badge>
      </Box>

      {/* Content */}
      <Box style={{ padding: '16px 20px 20px', height: '45%', overflowY: 'auto' }}>
        <Text
          fw={700}
          style={{ fontSize: '20px', color: '#fff', lineHeight: 1.2, marginBottom: '10px' }}
        >
          {movie.title}
        </Text>

        {/* Genres */}
        {movie.genres.length > 0 && (
          <Group gap={6} mb={12}>
            {movie.genres.slice(0, 3).map((genre) => (
              <Badge
                key={genre}
                variant="light"
                color="violet"
                size="sm"
                radius={6}
                style={{ fontSize: '11px' }}
              >
                {genre}
              </Badge>
            ))}
          </Group>
        )}

        {/* Description */}
        <Text
          size="sm"
          c="dimmed"
          mb={12}
          style={{
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {movie.overview || 'Описание недоступно'}
        </Text>

        {/* Actors */}
        {movie.actors.length > 0 && (
          <Stack gap={4}>
            <Group gap={6} align="center">
              <UserIcon size={13} color="#5c5f66" />
              <Text style={{ fontSize: '11px', color: '#5c5f66', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                В главных ролях
              </Text>
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
