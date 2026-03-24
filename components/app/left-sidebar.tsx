import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ShortcutBadge } from '@/components/app/shortcut-badge';
import { SECTION_SHORTCUT_BADGE } from '@/lib/shortcut-config';

export type AppSection = 'map' | 'journal' | 'backpack' | 'utility';

interface LeftSidebarProps {
  section: AppSection;
  onChangeSection: (section: AppSection) => void;
}

const NAV_ITEMS: { section: AppSection; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { section: 'map', icon: 'git-network-outline', label: 'Map' },
  { section: 'journal', icon: 'document-text-outline', label: 'Journal' },
  { section: 'backpack', icon: 'cube-outline', label: 'Backpack' },
  { section: 'utility', icon: 'settings-outline', label: 'Utility' },
];

export function LeftSidebar({ section, onChangeSection }: LeftSidebarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>JM</Text>
        <Text style={styles.brandSubtitle}>Navigator</Text>
      </View>

      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = section === item.section;
          return (
            <Pressable
              accessibilityLabel={item.label}
              key={item.section}
              onPress={() => onChangeSection(item.section)}
              style={[styles.navButton, isActive && styles.navButtonActive]}>
              <Ionicons color={isActive ? '#BFE6FF' : '#D5D9E0'} name={item.icon} size={20} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
              <ShortcutBadge shortcut={SECTION_SHORTCUT_BADGE[item.section]} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footerHint}>
        <Text style={styles.footerHintText}>Ctrl+P palette</Text>
        <Text style={styles.footerHintText}>Ctrl+K universal search</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 108,
    backgroundColor: '#05070B',
    borderRightWidth: 1,
    borderRightColor: '#1A2431',
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  brand: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1724',
    borderWidth: 1,
    borderColor: '#21405D',
    gap: 2,
  },
  brandTitle: {
    color: '#D2ECFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    color: '#7F97B0',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  navList: {
    gap: 8,
    flex: 1,
  },
  navButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#16202C',
    backgroundColor: '#0A0F16',
  },
  navButtonActive: {
    backgroundColor: '#0E1D2E',
    borderColor: '#2E5E8A',
  },
  navLabel: {
    color: '#C5CBD6',
    fontSize: 11,
    fontWeight: '600',
  },
  navLabelActive: {
    color: '#DBF1FF',
  },
  footerHint: {
    borderTopWidth: 1,
    borderTopColor: '#1D2B3D',
    paddingTop: 10,
    gap: 4,
  },
  footerHintText: {
    color: '#8CA2BC',
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
});