'use client';

import { useEffect, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  NumberInput,
  Select,
  Slider,
  Stack,
  Text,
  Title,
  SegmentedControl,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  CrownIcon,
  UserIcon,
  UsersThreeIcon,
  CheckCircleIcon,
  CircleIcon,
  SparkleIcon,
} from '@phosphor-icons/react';
import { GenreItem, Room } from '@/lib/types';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const inputStyles = {
  input: { background: '#25262b', border: '1px solid #373A40', color: '#fff' },
};

interface Props {
  room: Room;
  isHost: boolean;
  mySocketId: string;
  onStart: () => void;
  onStartWizard: () => void;
  onModeChange: (mode: 'classic' | 'preference') => void;
  onSettingsChange: (settings: { matchThreshold: number; requiredMatches: number; filters: { genreId?: number; minRating?: number } }) => void;
  settings: { matchThreshold: number; requiredMatches: number; genreId: string; minRating: number };
  onSettingsLocal: (s: { matchThreshold: number; requiredMatches: number; genreId: string; minRating: number }) => void;
}

export function RoomLobby({
  room,
  isHost,
  onStart,
  onStartWizard,
  onModeChange,
  settings,
  onSettingsLocal,
  onSettingsChange,
}: Props) {
  const isDesktop = useMediaQuery('(min-width: 860px)');
  const [genres, setGenres] = useState<GenreItem[]>([]);
  const [genresLoading, setGenresLoading] = useState(false);

  useEffect(() => {
    setGenresLoading(true);
    fetch(`${API}/api/genres`)
      .then((r) => r.json())
      .then((g: GenreItem[]) => setGenres(g))
      .catch(() => {})
      .finally(() => setGenresLoading(false));
  }, []);

  function handleChange(key: string, value: unknown) {
    const next = { ...settings, [key]: value };
    onSettingsLocal(next);
    onSettingsChange({
      matchThreshold: next.matchThreshold,
      requiredMatches: next.requiredMatches,
      filters: {
        genreId: next.genreId ? Number(next.genreId) : undefined,
        minRating: next.minRating > 0 ? next.minRating : undefined,
      },
    });
  }

  const participantCount = room.participants.length;
  const canStart = isHost && participantCount >= 2;

  const genreOptions = [
    { value: '', label: 'Все жанры' },
    ...genres.map((g) => ({ value: String(g.id), label: g.name })),
  ];

  const participantsList = (
    <Box style={{ background: '#1A1B1E', border: '1px solid #2C2E33', borderRadius: '16px', padding: '20px', height: '100%' }}>
      <Group gap={8} mb={16} align="center">
        <UserIcon size={15} color="#5c5f66" />
        <Text size="sm" c="dimmed" fw={500}>Участники ({participantCount}/6)</Text>
      </Group>
      <Stack gap={12}>
        {room.participants.map((p) => {
          const submitted = room.preferencesSubmitted?.includes(p.socketId);
          return (
            <Group key={p.socketId} gap={10} align="center">
              <Avatar size={34} radius="xl" color="violet" style={{ fontSize: '13px', flexShrink: 0 }}>
                {p.nickname.slice(0, 2).toUpperCase()}
              </Avatar>
              <Text size="sm" style={{ color: '#C1C2C5', flex: 1 }}>{p.nickname}</Text>
              {p.socketId === room.hostSocketId && (
                <CrownIcon size={14} weight="fill" color="#FAB005" />
              )}
              {room.mode === 'preference' && room.wizardStarted && (
                submitted
                  ? <CheckCircleIcon size={16} color="#51CF66" weight="fill" />
                  : <CircleIcon size={16} color="#5c5f66" />
              )}
            </Group>
          );
        })}
      </Stack>
      {room.mode === 'preference' && room.wizardStarted && (
        <Text size="xs" c="dimmed" mt={12} ta="center">
          {room.preferencesSubmitted?.length ?? 0}/{participantCount} заполнили анкету
        </Text>
      )}
    </Box>
  );

  const modeToggle = isHost && (
    <Box style={{ background: '#1A1B1E', border: '1px solid #2C2E33', borderRadius: '16px', padding: '20px' }}>
      <Text size="sm" c="dimmed" fw={500} mb={12}>Режим сессии</Text>
      <SegmentedControl
        fullWidth
        value={room.mode}
        onChange={(v) => onModeChange(v as 'classic' | 'preference')}
        data={[
          { label: 'Классический', value: 'classic' },
          { label: 'По предпочтениям', value: 'preference' },
        ]}
        styles={{
          root: { background: '#25262b', border: '1px solid #373A40' },
          label: { fontSize: '13px' },
        }}
      />
      {room.mode === 'preference' && (
        <Text size="xs" c="dimmed" mt={10} style={{ lineHeight: 1.5 }}>
          Каждый участник заполнит анкету с жанрами, актёрами и фильмами. Подборка будет персонализирована.
        </Text>
      )}
    </Box>
  );

  const classicSettingsPanel = isHost ? (
    <Box style={{ background: '#1A1B1E', border: '1px solid #2C2E33', borderRadius: '16px', padding: '20px' }}>
      <Text size="sm" c="dimmed" fw={500} mb={20}>Настройки сессии</Text>
      <Stack gap={24}>
        {genresLoading ? (
          <Group gap={8}><Loader size={14} color="violet" /><Text size="sm" c="dimmed">Загрузка жанров...</Text></Group>
        ) : (
          <Select
            label="Жанр"
            data={genreOptions}
            value={settings.genreId}
            onChange={(v) => handleChange('genreId', v || '')}
            styles={{
              label: { color: '#909296', fontSize: '13px', marginBottom: '6px' },
              ...inputStyles,
              dropdown: { background: '#25262b', border: '1px solid #373A40' },
            }}
          />
        )}
        <Box>
          <Text size="xs" c="dimmed" mb={10}>
            Минимальный рейтинг: {settings.minRating > 0 ? settings.minRating.toFixed(1) : 'любой'}
          </Text>
          <Slider
            min={0} max={9} step={0.5}
            value={settings.minRating}
            onChange={(v) => handleChange('minRating', v)}
            color="violet"
            marks={[{ value: 0, label: '0' }, { value: 5, label: '5' }, { value: 9, label: '9' }]}
            styles={{ mark: { display: 'none' }, markLabel: { fontSize: '11px', color: '#5c5f66' } }}
          />
        </Box>
        <Box>
          <Text size="xs" c="dimmed" mb={8}>Лайков для матча (0 = все участники)</Text>
          <NumberInput
            min={0} max={participantCount}
            value={settings.matchThreshold}
            onChange={(v) => handleChange('matchThreshold', Number(v))}
            styles={inputStyles}
          />
        </Box>
        <Box>
          <Text size="xs" c="dimmed" mb={8}>Матчей до конца сессии</Text>
          <NumberInput
            min={1} max={20}
            value={settings.requiredMatches}
            onChange={(v) => handleChange('requiredMatches', Number(v) || 1)}
            styles={inputStyles}
          />
        </Box>
      </Stack>
    </Box>
  ) : (
    <Box style={{ background: '#1A1B1E', border: '1px solid #2C2E33', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
      <Text c="dimmed" size="sm">Ждём пока хост начнёт сессию...</Text>
      {room.filters?.genreId && (
        <Text size="xs" c="dimmed" mt={8}>
          Жанр: {genres.find((g) => g.id === room.filters.genreId)?.name ?? room.filters.genreId}
        </Text>
      )}
    </Box>
  );

  const preferenceGuestPanel = !isHost && (
    <Box style={{ background: '#1A1B1E', border: '1px solid #2C2E33', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
      <SparkleIcon size={28} weight="duotone" color="#845ef7" style={{ marginBottom: '10px' }} />
      <Text size="sm" c="dimmed">Хост запустит анкету — после этого вы пройдёте опрос и получите персональную подборку фильмов.</Text>
    </Box>
  );

  const startButton = isHost && (
    room.mode === 'preference' ? (
      <Button
        fullWidth
        size="lg"
        onClick={onStartWizard}
        disabled={!canStart}
        leftSection={<SparkleIcon size={20} />}
        style={{ height: '52px', fontSize: '16px' }}
      >
        {!canStart ? `Нужно минимум 2 участника (${participantCount}/2)` : 'Запустить анкету'}
      </Button>
    ) : (
      <Button fullWidth size="lg" onClick={onStart} disabled={!canStart} style={{ height: '52px', fontSize: '16px' }}>
        {!canStart ? `Нужно минимум 2 участника (${participantCount}/2)` : 'Начать!'}
      </Button>
    )
  );

  const rightContent = (
    <Stack gap={16}>
      {modeToggle}
      {room.mode === 'classic' ? classicSettingsPanel : (isHost ? null : preferenceGuestPanel)}
      {startButton}
    </Stack>
  );

  return (
    <Box style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Box style={{
        padding: isDesktop ? '20px 40px' : '20px',
        borderBottom: '1px solid #2C2E33',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <Group gap={10}>
          <UsersThreeIcon size={24} weight="duotone" color="#845ef7" />
          <Title order={3} style={{ color: '#fff', fontSize: '18px' }}>Лобби</Title>
        </Group>
        <Group gap={8} align="center">
          <Text size="sm" c="dimmed">Код комнаты:</Text>
          <Badge variant="light" color="violet" style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '3px', padding: '4px 14px' }}>
            {room.id}
          </Badge>
        </Group>
      </Box>

      <Box style={{ flex: 1, padding: isDesktop ? '40px' : '20px', display: 'flex', alignItems: isDesktop ? 'flex-start' : 'center', justifyContent: 'center' }}>
        {isDesktop ? (
          <Box style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', width: '100%', maxWidth: '860px', alignItems: 'start' }}>
            {participantsList}
            {rightContent}
          </Box>
        ) : (
          <Stack gap={16} style={{ width: '100%', maxWidth: '420px' }}>
            {participantsList}
            {rightContent}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
