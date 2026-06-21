'use client';

import { useState } from 'react';
import { Badge, Box, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { TrophyIcon, XIcon, StarIcon, FilmStripIcon } from '@phosphor-icons/react';
import { useMediaQuery } from '@mantine/hooks';
import Image from 'next/image';
import { Movie } from '@/lib/types';
import { MovieDetailModal } from './MovieDetailModal';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

interface Props {
  matches: Movie[];
  isHost: boolean;
  opened: boolean;
  onClose: () => void;
  onFinish: () => void;
}

export function MatchesGallery({ matches, isHost, opened, onClose, onFinish }: Props) {
  const isDesktop = useMediaQuery('(min-width: 600px)');
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        withCloseButton={false}
        fullScreen
        styles={{
          content: { background: '#141517', display: 'flex', flexDirection: 'column' },
          body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 0 },
        }}
      >
        {/* Header */}
        <Box style={{ padding: '20px 24px', borderBottom: '1px solid #2C2E33', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <Group gap={10} align="center">
            <TrophyIcon size={22} weight="fill" color="#FAB005" />
            <Title order={3} style={{ color: '#fff', fontSize: '18px' }}>
              Матчи{matches.length > 0 ? ` · ${matches.length}` : ''}
            </Title>
          </Group>
          <Button
            variant="subtle"
            color="gray"
            size="xs"
            leftSection={<XIcon size={14} weight="bold" />}
            onClick={onClose}
          >
            Закрыть
          </Button>
        </Box>

        {/* Gallery grid */}
        <Box style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {matches.length === 0 ? (
            <Stack align="center" justify="center" style={{ height: '100%', minHeight: '200px' }}>
              <FilmStripIcon size={40} color="#5c5f66" weight="duotone" />
              <Text c="dimmed" size="sm">Матчей пока нет</Text>
            </Stack>
          ) : (
            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                gap: '16px',
                maxWidth: '900px',
                margin: '0 auto',
              }}
            >
              {matches.map((movie, i) => (
                <Box
                  key={movie.id}
                  onClick={() => setDetailMovie(movie)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Poster with 2:3 ratio (padding-bottom trick for Safari) */}
                  <Box style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '150%',
                    height: 0,
                    overflow: 'hidden',
                    borderRadius: '12px',
                    background: '#25262b',
                  }}>
                    <Box style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                      {movie.posterPath ? (
                        <Image
                          src={`${POSTER_BASE}${movie.posterPath}`}
                          alt={movie.title}
                          fill
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <Box style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FilmStripIcon size={32} color="#5c5f66" />
                        </Box>
                      )}
                      <Box style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)' }} />
                      <Badge
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(250,176,5,0.9)',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 800,
                          padding: '3px 8px',
                        }}
                      >
                        #{i + 1}
                      </Badge>
                      <Group gap={4} style={{ position: 'absolute', top: '8px', right: '8px' }}>
                        <StarIcon size={11} weight="fill" color="#FAB005" />
                        <Text style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>{movie.rating.toFixed(1)}</Text>
                      </Group>
                    </Box>
                  </Box>

                  <Box style={{ padding: '10px 4px 0' }}>
                    <Text size="sm" fw={600} style={{ color: '#fff', lineHeight: 1.3, marginBottom: '4px' }} lineClamp={2}>
                      {movie.title}
                    </Text>
                    {movie.genres.length > 0 && (
                      <Text size="xs" c="dimmed" lineClamp={1}>{movie.genres.slice(0, 2).join(' · ')}</Text>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Footer */}
        {isHost && (
          <Box style={{ padding: '16px 24px', borderTop: '1px solid #2C2E33', flexShrink: 0 }}>
            <Button
              fullWidth
              size="md"
              color="red"
              variant="light"
              leftSection={<XIcon size={16} weight="bold" />}
              onClick={onFinish}
              style={{ maxWidth: '420px', margin: '0 auto', display: 'block' }}
            >
              Завершить сессию
            </Button>
          </Box>
        )}
      </Modal>

      <MovieDetailModal movie={detailMovie} opened={detailMovie !== null} onClose={() => setDetailMovie(null)} />
    </>
  );
}
