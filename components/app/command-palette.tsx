import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle: string;
  keys?: string;
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: CommandPaletteItem[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return commands;
    }

    return commands.filter((command) => {
      const target = `${command.title} ${command.subtitle} ${command.keys ?? ''} ${command.keywords ?? ''}`.toLowerCase();
      return target.includes(needle);
    });
  }, [commands, query]);

  const runAndClose = (command: CommandPaletteItem) => {
    command.onSelect();
    onClose();
    setQuery('');
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={open}>
      <View style={styles.backdrop}>
        <Pressable onPress={onClose} style={styles.backdropDismiss} />
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Command Palette</Text>
          <TextInput
            autoFocus
            onChangeText={setQuery}
            placeholder="Type command, section, or shortcut..."
            placeholderTextColor="#8397AF"
            style={styles.searchInput}
            value={query}
          />

          <ScrollView style={styles.results}>
            {filtered.length === 0 ? <Text style={styles.emptyText}>No matching commands.</Text> : null}
            {filtered.map((command) => (
              <Pressable key={command.id} onPress={() => runAndClose(command)} style={styles.resultItem}>
                <View style={styles.resultMain}>
                  <Text style={styles.resultTitle}>{command.title}</Text>
                  <Text numberOfLines={1} style={styles.resultSubtitle}>
                    {command.subtitle}
                  </Text>
                </View>
                {command.keys ? <Text style={styles.resultKeys}>{command.keys}</Text> : null}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 13, 0.74)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 20,
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  panel: {
    width: '100%',
    maxWidth: 760,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#25405D',
    backgroundColor: '#0B121C',
    padding: 12,
    gap: 10,
  },
  panelTitle: {
    color: '#E5F0FF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D4059',
    backgroundColor: '#0F1927',
    color: '#E6EEF9',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  results: {
    maxHeight: 420,
  },
  emptyText: {
    color: '#8EA3BA',
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  resultItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#28384D',
    backgroundColor: '#101B29',
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultMain: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    color: '#EAF2FD',
    fontSize: 13,
    fontWeight: '700',
  },
  resultSubtitle: {
    color: '#9CB3CB',
    fontSize: 11,
  },
  resultKeys: {
    color: '#CDE4FF',
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#355577',
    backgroundColor: '#13243A',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
});
