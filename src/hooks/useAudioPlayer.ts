import { useRef } from 'react';
import { Audio } from 'expo-av';

export const useAudioPlayer = () => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const playSession = async (sessionNumber: number): Promise<void> => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const audioUri = getSessionAudioUri(sessionNumber);
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          // Audio ends - sessions 2-10 end in silence, no action required
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (error) {
      // Silent failure - no error drama
      soundRef.current = null;
    }
  };

  const stopSession = async (): Promise<void> => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (error) {
      // Silent failure
    }
  };

  return {
    playSession,
    stopSession,
  };
};

const getSessionAudioUri = (sessionNumber: number): string => {
  // Replace with actual audio file paths
  // For now, using placeholder structure
  return `session_${sessionNumber}.mp3`;
};
