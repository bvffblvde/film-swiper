'use client';

import { Button, Text, TextInput } from '@mantine/core';
import { FilmStripIcon } from '@phosphor-icons/react';
import styles from './NicknameForm.module.scss';

interface Props {
  roomId: string;
  nickname: string;
  onNicknameChange: (n: string) => void;
  onSubmit: () => void;
}

export function NicknameForm({ roomId, nickname, onNicknameChange, onSubmit }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <FilmStripIcon size={32} weight="duotone" color="var(--c-violet)" />
          <span className={styles.appName}>FilmSwiper</span>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Вход в комнату</p>
          <Text size="sm" c="dimmed" mb={20}>
            Код: <b className={styles.roomCode}>{roomId}</b>
          </Text>
          <TextInput
            placeholder="Ваш никнейм"
            value={nickname}
            onChange={(e) => onNicknameChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            size="md"
            mb={16}
            autoFocus
            styles={{
              input: {
                background: 'var(--c-elevated)',
                border: '1px solid var(--c-border-subtle)',
                color: 'var(--c-text)',
                height: '44px',
              },
            }}
          />
          <Button fullWidth size="md" onClick={onSubmit} className={styles.submitBtn}>
            Войти
          </Button>
        </div>
      </div>
    </div>
  );
}
