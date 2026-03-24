import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface ShortcutBadgeProps {
  shortcut: string;
  onPress?: () => void;
}

export function ShortcutBadge({ shortcut, onPress }: ShortcutBadgeProps) {
  return (
    <Pressable onPress={onPress} style={[styles.badge, onPress ? styles.badgeInteractive : null]}>
      <Text style={styles.badgeText}>{shortcut}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#355577',
    backgroundColor: '#13243A',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  badgeInteractive: {
    borderColor: '#4D7197',
  },
  badgeText: {
    color: '#D4EAFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
