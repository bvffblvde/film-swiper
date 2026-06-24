'use client';

import { useRef } from 'react';
import { Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

interface Props {
  opened: boolean;
  onClose: () => void;
}

const sharedHeaderStyles = {
  background: 'transparent',
  position: 'absolute' as const,
  top: 0,
  right: 0,
  zIndex: 10,
  padding: '8px',
  minHeight: 'unset',
};

const sharedCloseStyles = {
  background: 'rgba(0,0,0,0.55)',
  color: '#fff',
  backdropFilter: 'blur(4px)',
  borderRadius: '50%',
  width: '32px',
  height: '32px',
};

export function IntroVideoModal({ opened, onClose }: Props) {
  const isMobile = useMediaQuery('(max-width: 600px)');
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleClose() {
    videoRef.current?.pause();
    onClose();
  }

  if (isMobile) {
    return (
      <Modal
        opened={opened}
        onClose={handleClose}
        withCloseButton
        fullScreen
        padding={0}
        radius={0}
        overlayProps={{ blur: 0, opacity: 0 }}
        styles={{
          content: { background: '#000', border: 'none' },
          header: sharedHeaderStyles,
          close: sharedCloseStyles,
          body: { padding: '16px', lineHeight: 0, height: '100%', display: 'flex', alignItems: 'center' },
        }}
      >
        <video
          ref={videoRef}
          src="/into__mobile.mp4"
          autoPlay
          loop
          playsInline
          style={{ display: 'block', width: '100%', borderRadius: '16px' }}
        />
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton
      fullScreen
      padding={0}
      radius={0}
      overlayProps={{ blur: 6, opacity: 0.95 }}
      styles={{
        content: { background: '#000', border: 'none' },
        header: sharedHeaderStyles,
        close: sharedCloseStyles,
        body: {
          padding: 0,
          lineHeight: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <video
        ref={videoRef}
        src="/intro.mp4"
        autoPlay
        loop
        playsInline
        style={{
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100dvh',
          width: 'auto',
          height: 'auto',
        }}
      />
    </Modal>
  );
}
