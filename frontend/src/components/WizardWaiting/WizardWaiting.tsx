'use client';

import { Avatar, Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { CheckCircleIcon, CircleIcon, CrownIcon, FilmStripIcon, SparkleIcon } from '@phosphor-icons/react';
import { Room } from '@/lib/types';
import styles from './WizardWaiting.module.scss';

interface Props {
  room: Room;
  isHost: boolean;
  onStart: () => void;
}

export function WizardWaiting({ room, isHost, onStart }: Props) {
  const submittedCount = room.preferencesSubmitted?.length ?? 0;
  const totalCount = room.participants.length;

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <FilmStripIcon size={28} weight="duotone" color="var(--c-violet)" />
          <Text fw={700} style={{ fontSize: '20px', color: 'var(--c-text)' }}>FilmSwiper</Text>
        </div>

        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <SparkleIcon size={36} weight="duotone" color="var(--c-violet)" style={{ marginBottom: '12px' }} />
            <Title order={4} style={{ color: 'var(--c-text)', marginBottom: '6px' }}>Анкеты собираются</Title>
            <Text size="sm" c="dimmed">{submittedCount}/{totalCount} участников заполнили анкету</Text>
          </div>

          <Stack gap={10} mb={24}>
            {room.participants.map((p) => {
              const submitted = room.preferencesSubmitted?.includes(p.socketId);
              return (
                <Group key={p.socketId} gap={10} align="center">
                  <Avatar size={34} radius="xl" color="violet" style={{ fontSize: '12px', flexShrink: 0 }}>
                    {p.nickname.slice(0, 2).toUpperCase()}
                  </Avatar>
                  <Text size="sm" style={{ color: 'var(--c-text-muted)', flex: 1 }}>{p.nickname}</Text>
                  {p.socketId === room.hostSocketId && (
                    <CrownIcon size={13} weight="fill" color="var(--c-yellow)" />
                  )}
                  {submitted
                    ? <CheckCircleIcon size={18} color="var(--c-green)" weight="fill" />
                    : <CircleIcon size={18} color="#5c5f66" />}
                </Group>
              );
            })}
          </Stack>

          {isHost ? (
            <Button fullWidth size="md" onClick={onStart} leftSection={<SparkleIcon size={18} />} style={{ height: '48px' }}>
              Запустить подборку
            </Button>
          ) : (
            <div className={styles.waitBox}>
              <Loader size={20} color="violet" style={{ marginBottom: '8px' }} />
              <Text size="sm" c="dimmed">Ждём пока хост запустит подборку...</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
