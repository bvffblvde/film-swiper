'use client';

import { useRef } from 'react';
import { Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';

interface Props {
  opened: boolean;
  onClose: () => void;
}

// Video natural size: 1000×830 → ratio ≈ 1.2048
const RATIO = 1000 / 830;

export function IntroVideoModal({ opened, onClose }: Props) {
  const isMobile = useMediaQuery('(max-width: 600px)');
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleClose() {
    videoRef.current?.pause();
    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      withCloseButton
      centered={!isMobile}
      fullScreen={isMobile}
      size="1000px"
      radius={isMobile ? 0 : 12}
      padding={0}
      overlayProps={{ blur: 6, opacity: 0.9 }}
      styles={{
        content: {
          background: '#000',
          border: 'none',
          overflow: 'hidden',
          // Width is whichever is smaller: 1000px, or the width that makes height fit the viewport
          width: isMobile ? '100%' : `min(1000px, calc((100dvh - 40px) * ${RATIO}))`,
          maxWidth: '100vw',
        },
        header: {
          background: 'transparent',
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 10,
          padding: '8px',
          minHeight: 'unset',
        },
        close: {
          background: 'rgba(0,0,0,0.55)',
          color: '#fff',
          backdropFilter: 'blur(4px)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
        },
        body: { padding: 0, lineHeight: 0 },
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
          width: '100%',
          height: isMobile ? 'auto' : undefined,
          maxHeight: isMobile ? '100dvh' : undefined,
          objectFit: isMobile ? 'contain' : undefined,
        }}
      />
    </Modal>
  );
}
