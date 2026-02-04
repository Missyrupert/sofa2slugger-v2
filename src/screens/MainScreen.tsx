import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionList } from '../components/SessionList';
import { SessionScreen } from './SessionScreen';

const STORAGE_KEYS = {
  PURCHASE_UNLOCKED: 'purchaseUnlocked',
};

export const MainScreen: React.FC = () => {
  const [purchaseUnlocked, setPurchaseUnlocked] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  useEffect(() => {
    loadPurchaseState();
  }, []);

  const loadPurchaseState = async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASE_UNLOCKED);
      if (value !== null) {
        setPurchaseUnlocked(JSON.parse(value));
      }
    } catch (error) {
      // Silent failure
    }
  };

  const handleSessionPress = (sessionNumber: number) => {
    setSelectedSession(sessionNumber);
  };

  const handleBack = () => {
    setSelectedSession(null);
  };

  if (selectedSession !== null) {
    return (
      <SessionScreen
        sessionNumber={selectedSession}
        onBack={handleBack}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SessionList
        purchaseUnlocked={purchaseUnlocked}
        onSessionPress={handleSessionPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
