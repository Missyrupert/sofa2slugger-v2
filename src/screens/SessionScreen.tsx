import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';

const sessions = [
  {
    id: 1,
    title: 'Session 1',
    audioFile: 'session_1.mp3',
  },
  {
    id: 2,
    title: 'Session 2',
    audioFile: 'session_2.mp3',
  },
  {
    id: 3,
    title: 'Session 3',
    audioFile: 'session_3.mp3',
  },
  {
    id: 4,
    title: 'Session 4',
    audioFile: 'session_4.mp3',
  },
  {
    id: 5,
    title: 'Session 5',
    audioFile: 'session_5.mp3',
  },
  {
    id: 6,
    title: 'Session 6',
    audioFile: 'session_6.mp3',
  },
  {
    id: 7,
    title: 'Session 7',
    audioFile: 'session_7.mp3',
  },
  {
    id: 8,
    title: 'Session 8',
    audioFile: 'session_8.mp3',
  },
  {
    id: 9,
    title: 'Session 9',
    audioFile: 'session_9.mp3',
  },
  {
    id: 10,
    title: 'Session 10',
    audioFile: 'session_10.mp3',
  },
];

interface SessionScreenProps {
  sessionNumber: number;
  onBack: () => void;
}

export const SessionScreen: React.FC<SessionScreenProps> = ({
  sessionNumber,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { playSession, stopSession } = useAudioPlayer();

  const currentSession = sessions.find(s => s.id === sessionNumber);
  const showCompletionButton = currentSession?.id === 1;

  const handlePlay = async (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    setIsPlaying(true);
    await playSession(session.id);
    setIsPlaying(false);
  };

  const handleStop = () => {
    stopSession();
    setIsPlaying(false);
  };

  return (
    <View style={styles.container}>
      {sessions.map((session) => {
        return (
          <View key={session.id} style={styles.sessionItem}>
            <Text style={styles.sessionLabel}>{session.title}</Text>
            
            {!isPlaying ? (
              <TouchableOpacity style={styles.playButton} onPress={() => handlePlay(session.id)}>
                <Text style={styles.playButtonText}>Play</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            )}

            {session.id === 1 && showCompletionButton && (
              <TouchableOpacity style={styles.completionButton} onPress={onBack}>
                <Text style={styles.completionButtonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  sessionItem: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  sessionLabel: {
    fontSize: 24,
    marginBottom: 20,
    color: '#000',
  },
  playButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 4,
    marginBottom: 20,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  stopButton: {
    backgroundColor: '#666',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 4,
    marginBottom: 20,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  completionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  completionButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
