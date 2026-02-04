import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SessionListProps {
  purchaseUnlocked: boolean;
  onSessionPress: (sessionNumber: number) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
  purchaseUnlocked,
  onSessionPress,
}) => {
  const sessions = Array.from({ length: 10 }, (_, i) => i + 1);

  const isSessionUnlocked = (sessionNumber: number): boolean => {
    if (sessionNumber === 1) return true;
    return purchaseUnlocked;
  };

  const handleSessionPress = (sessionNumber: number) => {
    if (isSessionUnlocked(sessionNumber)) {
      onSessionPress(sessionNumber);
    }
  };

  return (
    <View style={styles.container}>
      {sessions.map((sessionNumber) => {
        const unlocked = isSessionUnlocked(sessionNumber);
        // Sessions 2-10: visible but inactive before purchase, tappable after
        return (
          <TouchableOpacity
            key={sessionNumber}
            style={[
              styles.sessionItem,
              !unlocked && styles.sessionItemInactive,
            ]}
            onPress={() => handleSessionPress(sessionNumber)}
            disabled={!unlocked}
            activeOpacity={unlocked ? 0.7 : 1}
          >
            <Text style={[styles.sessionText, !unlocked && styles.sessionTextInactive]}>
              {sessionNumber}
            </Text>
          </TouchableOpacity>
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sessionItemInactive: {
    opacity: 0.5,
  },
  sessionText: {
    fontSize: 18,
    color: '#000',
  },
  sessionTextInactive: {
    color: '#666',
  },
});
