'use client';

import { Badge, Box, Button, Group, Modal, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { StarIcon, XIcon, UsersIcon, FilmStripIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { Movie } from '@/lib/types';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

interface Props {
  movie: Movie | null;
  opened: boolean;
  onClose: () => void;
}

export function MovieDetailModal({ movie, opened, onClose }: Props) {
  if (!movie) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      withCloseButton={false}
      centered
      size="lg"
      radius={20}
      overlayProps={{ blur: 4, opacity: 0.85 }}
      styles={{
        content: { background: '#1A1B1E', border: '1px solid #2C2E33', overflow: 'hidden' },
        body: { padding: 0 },
      }}
    >
      <Box style={{ position: 'relative', height: '320px', background: '#25262b', flexShrink: 0 }}>
        {movie.posterPath ? (
          <Image
            src={`${POSTER_BASE}${movie.posterPath}`}
            alt={movie.title}
            fill
            style={{ objectFit: 'cover', objectPosition: 'center 20%' }}
          />
        ) : (
          <Box style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FilmStripIcon size={48} color="#5c5f66" weight="duotone" />
          </Box>
        )}
        <Box style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #1A1B1E 0%, rgba(26,27,30,0.4) 60%, transparent 100%)' }} />

        <Button
          variant="filled"
          color="dark"
          size="xs"
          radius="xl"
          leftSection={<XIcon size={12} weight="bold" />}
          onClick={onClose}
          style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(20,20,20,0.8)', backdropFilter: 'blur(4px)' }}
        >
          Закрыть
        </Button>
      </Box>

      <ScrollArea style={{ maxHeight: '55vh' }}>
        <Stack gap={16} p={24} pt={16}>
          <Box>
            <Title order={2} style={{ color: '#fff', fontSize: '24px', marginBottom: '10px', lineHeight: 1.2 }}>
              {movie.title}
            </Title>

            <Group gap={10} align="center" wrap="wrap">
              <Group gap={5} align="center">
                <StarIcon size={16} weight="fill" color="#FAB005" />
                <Text fw={700} style={{ color: '#FAB005', fontSize: '15px' }}>{movie.rating.toFixed(1)}</Text>
              </Group>
              {movie.genres.map((g) => (
                <Badge key={g} variant="light" color="violet" size="sm" radius={6}>{g}</Badge>
              ))}
            </Group>
          </Box>

          {movie.overview && (
            <Box>
              <Text size="xs" c="dimmed" fw={600} style={{ textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Описание
              </Text>
              <Text size="sm" style={{ color: '#C1C2C5', lineHeight: 1.7 }}>
                {movie.overview}
              </Text>
            </Box>
          )}

          {movie.actors.length > 0 && (
            <Box>
              <Group gap={6} mb={10} align="center">
                <UsersIcon size={14} color="#5c5f66" />
                <Text size="xs" c="dimmed" fw={600} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                  В ролях
                </Text>
              </Group>
              <Group gap={8} wrap="wrap">
                {movie.actors.map((actor) => (
                  <Badge key={actor} variant="default" size="sm" radius={6} style={{ background: '#25262b', color: '#C1C2C5', border: '1px solid #373A40' }}>
                    {actor}
                  </Badge>
                ))}
              </Group>
            </Box>
          )}
        </Stack>
      </ScrollArea>
    </Modal>
  );
}
