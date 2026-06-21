'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
  CopyButton,
  ActionIcon,
  Tooltip,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import {
  FilmStripIcon,
  LinkSimpleIcon,
  CheckIcon,
  ArrowRightIcon,
  UsersIcon,
  SmileyWinkIcon,
  GlobeIcon,
  ConfettiIcon,
} from '@phosphor-icons/react';
import { notifications } from '@mantine/notifications';

const HOW_IT_WORKS = [
  { icon: UsersIcon, text: 'Создайте комнату и позовите друзей' },
  { icon: FilmStripIcon, text: 'Свайпайте карточки фильмов' },
  { icon: ConfettiIcon, text: 'Матч — когда все выбрали одно!' },
];

export default function HomePage() {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 860px)');
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState<'create' | 'join' | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{ id: string; url: string } | null>(null);

  function getOrConnectSocket() {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    return socket;
  }

  function handleCreate() {
    if (!nickname.trim()) {
      notifications.show({ message: 'Введите никнейм', color: 'red' });
      return;
    }
    setLoading('create');
    const socket = getOrConnectSocket();
    socket.emit('create-room', { nickname: nickname.trim() }, ({ roomId }: { roomId: string }) => {
      sessionStorage.setItem('fs_nickname', nickname.trim());
      sessionStorage.setItem('fs_roomId', roomId);
      const url = `${window.location.origin}/room/${roomId}`;
      setCreatedRoom({ id: roomId, url });
      setLoading(null);
    });
  }

  function handleJoin() {
    if (!nickname.trim()) {
      notifications.show({ message: 'Введите никнейм', color: 'red' });
      return;
    }
    if (!joinCode.trim()) {
      notifications.show({ message: 'Введите код комнаты', color: 'red' });
      return;
    }
    setLoading('join');
    const socket = getOrConnectSocket();
    socket.emit(
      'join-room',
      { roomId: joinCode.trim().toUpperCase(), nickname: nickname.trim() },
      ({ success, error }: { success: boolean; error?: string }) => {
        setLoading(null);
        if (!success) {
          notifications.show({ message: error || 'Ошибка входа', color: 'red' });
          return;
        }
        sessionStorage.setItem('fs_nickname', nickname.trim());
        sessionStorage.setItem('fs_roomId', joinCode.trim().toUpperCase());
        router.push(`/room/${joinCode.trim().toUpperCase()}`);
      }
    );
  }

  const formCard = (
    <Paper radius={20} p={36} style={{ background: '#1A1B1E', border: '1px solid #2C2E33', width: '100%' }}>
      <TextInput
        label="Ваш никнейм"
        placeholder="Как вас зовут?"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        size="md"
        styles={{
          label: { color: '#909296', fontSize: '13px', marginBottom: '6px' },
          input: { background: '#25262b', border: '1px solid #373A40', color: '#fff', height: '46px' },
        }}
        mb={24}
      />
      <Button
        fullWidth
        size="md"
        onClick={handleCreate}
        loading={loading === 'create'}
        leftSection={<UsersIcon size={18} weight="bold" />}
        style={{ height: '50px', fontSize: '15px', marginBottom: '20px' }}
      >
        Создать комнату
      </Button>
      <Divider label="или войти по коду" labelPosition="center" color="#2C2E33" mb={20} />
      <Group gap={8} align="flex-end">
        <TextInput
          placeholder="ABCDEF"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          size="md"
          style={{ flex: 1 }}
          styles={{
            input: {
              background: '#25262b',
              border: '1px solid #373A40',
              color: '#fff',
              height: '50px',
              letterSpacing: '4px',
              fontWeight: 700,
              fontSize: '20px',
              textTransform: 'uppercase',
            },
          }}
        />
        <Button size="md" onClick={handleJoin} loading={loading === 'join'} style={{ height: '50px', paddingInline: '20px' }}>
          <ArrowRightIcon size={20} weight="bold" />
        </Button>
      </Group>
    </Paper>
  );

  return (
    <Box style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {isDesktop ? (
        <Box style={{ display: 'grid', gridTemplateColumns: '1fr 460px', gap: '80px', width: '100%', maxWidth: '960px', alignItems: 'center' }}>
          <Stack gap={0}>
            <Group gap={12} mb={20}>
              <FilmStripIcon size={44} weight="duotone" color="#845ef7" />
              <Title order={1} style={{ fontSize: '38px', color: '#fff', letterSpacing: '-1px' }}>
                FilmSwiper
              </Title>
            </Group>
            <Text style={{ fontSize: '18px', color: '#909296', lineHeight: 1.6, marginBottom: '48px' }}>
              Тиндер для фильмов. Свайпайте вместе с друзьями и находите фильм, который понравится всем.
            </Text>
            <Stack gap={20}>
              {HOW_IT_WORKS.map(({ icon: Icon, text }, i) => (
                <Group key={i} gap={16} align="center">
                  <ThemeIcon size={40} radius="xl" variant="light" color="violet">
                    <Icon size={20} weight="duotone" />
                  </ThemeIcon>
                  <Text style={{ color: '#C1C2C5', fontSize: '15px' }}>{text}</Text>
                </Group>
              ))}
            </Stack>
            <Group gap={8} mt={48} align="center">
              <SmileyWinkIcon size={16} color="#5c5f66" />
              <Text size="xs" c="dimmed">Данные фильмов предоставлены TMDB</Text>
              <GlobeIcon size={14} color="#5c5f66" />
            </Group>
          </Stack>
          {formCard}
        </Box>
      ) : (
        <Stack gap={0} style={{ width: '100%', maxWidth: '420px' }}>
          <Group gap={10} mb={40} justify="center">
            <FilmStripIcon size={34} weight="duotone" color="#845ef7" />
            <Title order={1} style={{ fontSize: '26px', color: '#fff', letterSpacing: '-0.5px' }}>
              FilmSwiper
            </Title>
          </Group>
          {formCard}
        </Stack>
      )}

      <Modal
        opened={!!createdRoom}
        onClose={() => setCreatedRoom(null)}
        title="Комната создана"
        centered
        radius={16}
        size="sm"
        styles={{
          content: { background: '#1A1B1E', border: '1px solid #2C2E33' },
          header: { background: '#1A1B1E' },
        }}
      >
        <Stack gap={20}>
          <Box>
            <Text size="sm" c="dimmed" mb={8}>Код комнаты</Text>
            <Group gap={12} align="center">
              <Text style={{ fontSize: '40px', fontWeight: 700, letterSpacing: '8px', color: '#845ef7' }}>
                {createdRoom?.id}
              </Text>
              <CopyButton value={createdRoom?.id || ''} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Скопировано!' : 'Копировать'}>
                    <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy} size="lg">
                      {copied ? <CheckIcon size={20} weight="bold" /> : <LinkSimpleIcon size={20} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Box>
          <Box>
            <Text size="sm" c="dimmed" mb={8}>Ссылка для друзей</Text>
            <Group gap={8}>
              <Text size="sm" style={{ flex: 1, background: '#25262b', padding: '10px 14px', borderRadius: '8px', color: '#909296', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {createdRoom?.url}
              </Text>
              <CopyButton value={createdRoom?.url || ''} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Скопировано!' : 'Копировать ссылку'}>
                    <ActionIcon variant="light" color={copied ? 'teal' : 'violet'} onClick={copy} size="lg">
                      {copied ? <CheckIcon size={18} weight="bold" /> : <LinkSimpleIcon size={18} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Box>
          <Button fullWidth size="md" onClick={() => createdRoom && router.push(`/room/${createdRoom.id}`)} style={{ height: '48px' }}>
            Войти в комнату
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
