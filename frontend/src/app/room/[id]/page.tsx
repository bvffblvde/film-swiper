'use client';

import { useParams } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useRoom } from '@/hooks/useRoom';
import { NicknameForm } from '@/components/NicknameForm';
import { WizardWaiting } from '@/components/WizardWaiting';
import { SwipingView } from '@/components/SwipingView';
import { RoomLobby } from '@/components/RoomLobby';
import { PreferenceWizard } from '@/components/PreferenceWizard';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();

  const {
    phase,
    nickname, setNickname,
    room,
    movies, currentIndex,
    matchEvent, matchedMovies,
    showGallery, setShowGallery,
    infoMovie, setInfoMovie,
    lobbySettings, setLobbySettings,
    isHost,
    handleNicknameSubmit,
    handleStart, handleStartWizard,
    handleModeChange, handleSettingsChange,
    handleWizardComplete,
    handleSwipe, handleExhausted, handleFinish,
    handleMatchContinue, handleMatchViewGallery,
  } = useRoom(id);

  if (phase === 'nickname') {
    return (
      <NicknameForm
        roomId={id}
        nickname={nickname}
        onNicknameChange={setNickname}
        onSubmit={handleNicknameSubmit}
      />
    );
  }

  if (phase === 'lobby' && room) {
    return (
      <RoomLobby
        room={room}
        isHost={isHost}
        onStart={handleStart}
        onStartWizard={handleStartWizard}
        onModeChange={handleModeChange}
        onSettingsChange={handleSettingsChange}
        settings={lobbySettings}
        onSettingsLocal={setLobbySettings}
      />
    );
  }

  if (phase === 'wizard') {
    return <PreferenceWizard nickname={nickname} onComplete={handleWizardComplete} />;
  }

  if (phase === 'wizard-waiting' && room) {
    return <WizardWaiting room={room} isHost={isHost} onStart={handleStart} />;
  }

  if (phase === 'loading') {
    return (
      <Center style={{ minHeight: '100dvh' }}>
        <Stack align="center" gap={16}>
          <Loader size={48} color="violet" />
          <Text c="dimmed" size="lg">Загружаем фильмы...</Text>
        </Stack>
      </Center>
    );
  }

  if (phase === 'ended') {
    return (
      <Center style={{ minHeight: '100dvh' }}>
        <Stack align="center" gap={16}>
          <Text fw={700} style={{ fontSize: '24px', color: '#fff' }}>Сессия завершена</Text>
          <Text c="dimmed">Возвращаемся на главную...</Text>
        </Stack>
      </Center>
    );
  }

  if ((phase === 'swiping' || phase === 'matched') && room) {
    return (
      <SwipingView
        roomId={id}
        room={room}
        phase={phase}
        movies={movies}
        currentIndex={currentIndex}
        matchEvent={matchEvent}
        matchedMovies={matchedMovies}
        showGallery={showGallery}
        onGalleryChange={setShowGallery}
        infoMovie={infoMovie}
        onInfoChange={setInfoMovie}
        isHost={isHost}
        onSwipe={handleSwipe}
        onExhausted={handleExhausted}
        onFinish={handleFinish}
        onMatchContinue={handleMatchContinue}
        onMatchViewGallery={handleMatchViewGallery}
      />
    );
  }

  return null;
}
