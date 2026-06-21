'use client';

import { Badge, Box, Button, Group, Modal, Stack, Text, Title } from '@mantine/core';
import { ConfettiIcon, StarIcon, XIcon } from '@phosphor-icons/react';
import { Movie } from '@/lib/types';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface Props {
  movie: Movie | null;
  opened: boolean;
  onFinish: () => void;
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

export function MatchModal({ movie, opened, onFinish }: Props) {
  if (!movie) return null;

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      withCloseButton={false}
      centered
      size="sm"
      radius={20}
      overlayProps={{ blur: 6, opacity: 0.8 }}
      styles={{
        content: { background: '#1A1B1E', border: '1px solid #2C2E33', overflow: 'hidden' },
        body: { padding: 0 },
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <Box style={{ position: 'relative', height: '280px', background: '#25262b' }}>
          {movie.posterPath ? (
            <Image src={`${POSTER_BASE}${movie.posterPath}`} alt={movie.title} fill style={{ objectFit: 'cover' }} />
          ) : null}
          <Box style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #1A1B1E 20%, transparent)' }} />
          <Box style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2, stiffness: 400, damping: 20 }}
            >
              <Box style={{ background: 'rgba(132,94,247,0.95)', backdropFilter: 'blur(8px)', borderRadius: '50px', padding: '8px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '2px solid rgba(255,255,255,0.2)' }}>
                <ConfettiIcon size={22} weight="fill" color="#fff" />
                <Text fw={800} style={{ fontSize: '18px', color: '#fff', letterSpacing: '0.5px' }}>
                  Вы выбрали!
                </Text>
              </Box>
            </motion.div>
          </Box>
        </Box>

        <Stack gap={16} p={24}>
          <Box>
            <Title order={3} style={{ color: '#fff', fontSize: '22px', marginBottom: '8px' }}>
              {movie.title}
            </Title>
            <Group gap={10} align="center">
              <Group gap={4} align="center">
                <StarIcon size={14} weight="fill" color="#FAB005" />
                <Text size="sm" c="yellow" fw={600}>{movie.rating.toFixed(1)}</Text>
              </Group>
              {movie.genres.slice(0, 2).map((g) => (
                <Badge key={g} variant="light" color="violet" size="sm" radius={6}>{g}</Badge>
              ))}
            </Group>
          </Box>

          {movie.actors.length > 0 && (
            <Text size="sm" c="dimmed">{movie.actors.join(' · ')}</Text>
          )}

          <Button
            fullWidth size="lg" color="red" variant="light"
            leftSection={<XIcon size={18} weight="bold" />}
            onClick={onFinish}
            style={{ height: '52px', fontSize: '16px', marginTop: '8px' }}
          >
            Завершить сессию
          </Button>
        </Stack>
      </motion.div>
    </Modal>
  );
}
