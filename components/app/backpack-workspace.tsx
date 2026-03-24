import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { SearchComboBox } from '@/components/app/search-combobox';
import { AppState, findAreaById, flattenAreasWithPath, makeId, makeSequentialUntitledName } from '@/lib/app-model';

interface BackpackWorkspaceProps {
  state: AppState;
  onChange: (next: AppState) => void;
  externalSelectedItemId?: string | null;
  onConsumedExternalSelection?: () => void;
  onOpenLinkedArea?: (areaId: string) => void;
}

export function BackpackWorkspace({
  state,
  onChange,
  externalSelectedItemId,
  onConsumedExternalSelection,
  onOpenLinkedArea,
}: BackpackWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(Object.keys(state.backpack)[0] ?? null);
  const [contextMenuItemId, setContextMenuItemId] = useState<string | null>(null);
  const [metadataExpanded, setMetadataExpanded] = useState(true);
  const [contentMode, setContentMode] = useState<'view' | 'edit'>('view');
  const [tagsDraft, setTagsDraft] = useState('');
  const editorTransition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    editorTransition.setValue(0.98);
    Animated.timing(editorTransition, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [editorTransition, selectedId]);

  const items = useMemo(() => Object.values(state.backpack), [state.backpack]);
  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) {
      return items;
    }

    return items.filter((item) => {
      const blob = `${item.name} ${item.descriptions} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
      return blob.includes(lower);
    });
  }, [items, query]);

  const selected = selectedId ? state.backpack[selectedId] : null;
  const selectedContent = selected?.content ?? '';

  const selectedWordCount = useMemo(() => {
    const words = selectedContent
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return words.length;
  }, [selectedContent]);

  const confirmDelete = (message: string, onConfirm: () => void) => {
    if (typeof (globalThis as any).confirm === 'function') {
      if ((globalThis as any).confirm(message)) {
        onConfirm();
      }
      return;
    }

    Alert.alert('Confirm deletion', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  };

  useEffect(() => {
    if (!externalSelectedItemId) {
      return;
    }
    if (!state.backpack[externalSelectedItemId]) {
      onConsumedExternalSelection?.();
      return;
    }

    setSelectedId(externalSelectedItemId);
    onConsumedExternalSelection?.();
  }, [externalSelectedItemId, onConsumedExternalSelection, state.backpack]);

  useEffect(() => {
    setTagsDraft(selected?.tags.join(', ') ?? '');
  }, [selected?.id, selected?.tags]);

  useEffect(() => {
    if (!selected || !selected.area || !selectedId) {
      return;
    }

    const exists = findAreaById(state.world, selected.area);
    if (exists) {
      return;
    }

    onChange({
      ...state,
      backpack: {
        ...state.backpack,
        [selectedId]: {
          ...selected,
          area: null,
        },
      },
    });
  }, [onChange, selected, selectedId, state]);

  const areaOptions = useMemo(
    () =>
      flattenAreasWithPath(state.world).map((area) => ({
        value: area.id,
        label: area.name,
        subtitle: area.pathLabel,
      })),
    [state.world]
  );

  const createItem = () => {
    const entered = newItemName.trim();
    const fallbackName = makeSequentialUntitledName(
      Object.values(state.backpack).map((item) => item.name),
      'Untitled Item'
    );
    const id = makeId('backpack');
    const next = {
      id,
      area: null,
      name: entered || fallbackName,
      descriptions: '',
      content: '',
      tags: [],
    };
    onChange({
      ...state,
      backpack: {
        ...state.backpack,
        [id]: next,
      },
    });
    setSelectedId(id);
    setNewItemName('');
  };

  const deleteItemById = (itemId: string) => {
    if (!state.backpack[itemId]) {
      return;
    }
    const next = { ...state.backpack };
    delete next[itemId];
    onChange({ ...state, backpack: next });
    setSelectedId((current) => (current === itemId ? (Object.keys(next)[0] ?? null) : current));
    setContextMenuItemId(null);
  };

  const deleteSelected = () => {
    if (!selectedId) {
      return;
    }
    deleteItemById(selectedId);
  };

  const updateSelected = (patch: Partial<(typeof items)[number]>) => {
    if (!selectedId || !selected) {
      return;
    }
    onChange({
      ...state,
      backpack: {
        ...state.backpack,
        [selectedId]: {
          ...selected,
          ...patch,
        },
      },
    });
  };

  return (
    <View style={styles.root}>
      <View style={styles.leftPane}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.title}>Backpack Library</Text>
          <Text style={styles.sidebarSubtitle}>Dump snippets, assets, and reusable insights</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryText}>Items: {items.length}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryText}>Visible: {filtered.length}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          <TextInput
            onChangeText={setQuery}
            placeholder="Filter by name, tags, description, content"
            placeholderTextColor="#8393A9"
            style={styles.input}
            value={query}
          />
        </View>
        <View style={styles.controls}>
          <TextInput
            onChangeText={setNewItemName}
            placeholder="New item name"
            placeholderTextColor="#8393A9"
            style={styles.input}
            value={newItemName}
          />
          <Pressable onPress={createItem} style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>Add</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <Text style={styles.listEmptyText}>
              {items.length === 0
                ? 'Backpack is empty. Create your first item here or use Ctrl+Shift+B.'
                : 'No matching items.'}
            </Text>
          ) : null}
          {filtered.map((item) => {
            const active = item.id === selectedId;
            const areaName = item.area ? findAreaById(state.world, item.area)?.name ?? '<Unknown Area>' : 'General';
            return (
              <Pressable
                {...({
                  onContextMenu: (event: any) => {
                    event.preventDefault?.();
                    setContextMenuItemId(item.id);
                  },
                } as any)}
                key={item.id}
                onLongPress={() => setContextMenuItemId(item.id)}
                onPress={() => setSelectedId(item.id)}
                style={[styles.card, active && styles.cardActive]}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{areaName}</Text>
                <Text numberOfLines={2} style={styles.cardText}>
                  {item.descriptions || 'No description'}
                </Text>
                {contextMenuItemId === item.id ? (
                  <View style={styles.inlineMenu}>
                    <Pressable onPress={() => setSelectedId(item.id)} style={styles.inlineMenuButton}>
                      <Text style={styles.inlineMenuLabel}>Open</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        confirmDelete('Delete this backpack item? This cannot be undone in current session.', () =>
                          deleteItemById(item.id)
                        )
                      }
                      style={styles.inlineDangerButton}>
                      <Text style={styles.inlineDangerLabel}>Delete</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.editorPane}>
        {!selected ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {items.length === 0
                ? 'No backpack items yet. Add one from the left to store snippets and reusable notes.'
                : 'Select a backpack item on the left to edit its content.'}
            </Text>
          </View>
        ) : (
          <Animated.View
            style={{
              flex: 1,
              opacity: editorTransition,
              transform: [
                {
                  translateY: editorTransition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                },
              ],
            }}>
          <ScrollView contentContainerStyle={styles.editorContent}>
            <View style={styles.editorHeaderCard}>
              <Text style={styles.editorTitle}>{selected.name || 'Untitled Item'}</Text>
              <View style={styles.editorMetaRow}>
                <Text style={styles.editorMeta}>Words: {selectedWordCount}</Text>
                <Text style={styles.editorMeta}>Tags: {selected.tags.length}</Text>
                <Text style={styles.editorMeta}>{selected.area ? 'Linked to area' : 'General item'}</Text>
              </View>
            </View>

            <View style={styles.metaCard}>
              <Pressable
                onPress={() => {
                  setMetadataExpanded((current) => !current);
                }}
                style={styles.collapseToggle}>
                <Text style={styles.collapseToggleText}>{metadataExpanded ? 'Hide Metadata' : 'Show Metadata'}</Text>
                <Text style={styles.collapseToggleChevron}>{metadataExpanded ? '▴' : '▾'}</Text>
              </Pressable>

              {metadataExpanded ? (
                <>
                  <Text style={styles.label}>Name</Text>
                  <TextInput onChangeText={(value) => updateSelected({ name: value })} style={styles.input} value={selected.name} />

                  <Text style={styles.label}>Area (optional)</Text>
                  <SearchComboBox
                    allowClear
                    nullLabel="General dump (no area)"
                    onChange={(value) => updateSelected({ area: value })}
                    options={areaOptions}
                    placeholder="Select area"
                    value={selected.area}
                  />
                  {selected.area ? (
                    <Pressable onPress={() => onOpenLinkedArea?.(selected.area as string)} style={styles.inlineMenuButton}>
                      <Text style={styles.inlineMenuLabel}>Open Linked Area in Map</Text>
                    </Pressable>
                  ) : null}

                  <Text style={styles.label}>Tags (comma separated)</Text>
                  <TextInput
                    onBlur={() =>
                      updateSelected({
                        tags: tagsDraft
                          .split(',')
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      })
                    }
                    onChangeText={setTagsDraft}
                    style={styles.input}
                    value={tagsDraft}
                  />

                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) => updateSelected({ descriptions: value })}
                    style={[styles.input, styles.textArea]}
                    value={selected.descriptions}
                  />

                  <Pressable
                    onPress={() =>
                      confirmDelete('Delete this backpack item? This cannot be undone in current session.', deleteSelected)
                    }
                    style={styles.dangerButton}>
                    <Text style={styles.dangerLabel}>Delete Item</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <View style={styles.editorHeaderRow}>
              <Text style={styles.label}>Content</Text>
              <View style={styles.modeSwitch}>
                <Pressable
                  onPress={() => setContentMode('view')}
                  style={[styles.modeButton, contentMode === 'view' && styles.modeButtonActive]}>
                  <Text style={[styles.modeButtonText, contentMode === 'view' && styles.modeButtonTextActive]}>View</Text>
                </Pressable>
                <Pressable
                  onPress={() => setContentMode('edit')}
                  style={[styles.modeButton, contentMode === 'edit' && styles.modeButtonActive]}>
                  <Text style={[styles.modeButtonText, contentMode === 'edit' && styles.modeButtonTextActive]}>Edit</Text>
                </Pressable>
              </View>
            </View>

            {contentMode === 'edit' ? (
              <TextInput
                multiline
                onChangeText={(value) => updateSelected({ content: value })}
                placeholder="Dump ideas, snippets, reusable notes..."
                placeholderTextColor="#8393A9"
                style={styles.contentEditor}
                value={selected.content}
              />
            ) : (
              <ScrollView style={styles.previewWrap}>
                <Markdown
                  style={{
                    body: styles.previewBody,
                    heading1: styles.previewH1,
                    heading2: styles.previewH2,
                    heading3: styles.previewH3,
                    paragraph: styles.previewParagraph,
                    list_item: styles.previewListItem,
                    bullet_list: styles.previewList,
                    ordered_list: styles.previewList,
                    code_inline: styles.previewInlineCode,
                    code_block: styles.previewCodeBlock,
                    blockquote: styles.previewQuote,
                    link: styles.previewLink,
                  }}>
                  {selected.content || '_Empty item content. Switch to Edit mode to start writing._'}
                </Markdown>
              </ScrollView>
            )}
          </ScrollView>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#090B10',
  },
  leftPane: {
    width: 310,
    borderRightWidth: 1,
    borderRightColor: '#243246',
    backgroundColor: '#0C1017',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sidebarHeader: {
    gap: 4,
    marginBottom: 10,
  },
  title: {
    color: '#F0F7FF',
    fontSize: 16,
    fontWeight: '800',
  },
  sidebarSubtitle: {
    color: '#8CA3BD',
    fontSize: 11,
    lineHeight: 16,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  summaryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2C415A',
    backgroundColor: '#102030',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  summaryText: {
    color: '#B9D2EA',
    fontSize: 11,
    fontWeight: '700',
  },
  input: {
    minHeight: 38,
    borderRadius: 10,
    borderColor: '#2A3950',
    borderWidth: 1,
    backgroundColor: '#0F1722',
    color: '#E4ECF8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    flex: 1,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#114D83',
    borderColor: '#2F7FBA',
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: '#EAF6FF',
    fontWeight: '700',
    fontSize: 12,
  },
  list: {
    gap: 8,
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A384C',
    backgroundColor: '#111B29',
    padding: 10,
    gap: 4,
  },
  cardActive: {
    borderColor: '#73C5FF',
    backgroundColor: '#132A42',
  },
  cardTitle: {
    color: '#E6EEF9',
    fontSize: 13,
    fontWeight: '700',
  },
  cardMeta: {
    color: '#9CB2C8',
    fontSize: 11,
    fontWeight: '600',
  },
  cardText: {
    color: '#B7C5D8',
    fontSize: 12,
  },
  inlineMenu: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  inlineMenuButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D425D',
    backgroundColor: '#122337',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  inlineMenuLabel: {
    color: '#D8ECFF',
    fontSize: 11,
    fontWeight: '700',
  },
  inlineDangerButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5B2530',
    backgroundColor: '#2F1419',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  inlineDangerLabel: {
    color: '#FFD9DF',
    fontSize: 11,
    fontWeight: '700',
  },
  listEmptyText: {
    color: '#8FA3BB',
    fontSize: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  editorPane: {
    flex: 1,
    padding: 18,
    backgroundColor: '#090F18',
  },
  editorHeaderCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3D56',
    backgroundColor: '#0D1826',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  editorTitle: {
    color: '#EEF6FF',
    fontSize: 15,
    fontWeight: '800',
  },
  editorMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  editorMeta: {
    color: '#9FBCD8',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#9AA9BC',
    fontSize: 14,
  },
  editorContent: {
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B3A4E',
    backgroundColor: '#0D1623',
    padding: 12,
    paddingBottom: 24,
  },
  metaCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#35506F',
    backgroundColor: '#101E2E',
    padding: 10,
    gap: 8,
  },
  editorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  label: {
    color: '#AAC0D7',
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  collapseToggle: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#35506F',
    backgroundColor: '#112132',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapseToggleText: {
    color: '#D5EAFF',
    fontSize: 12,
    fontWeight: '700',
  },
  collapseToggleChevron: {
    color: '#A8C3DF',
    fontSize: 12,
    fontWeight: '700',
  },
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#37516F',
    overflow: 'hidden',
  },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#132338',
  },
  modeButtonActive: {
    backgroundColor: '#1B3A5A',
  },
  modeButtonText: {
    color: '#9EC1E2',
    fontSize: 11,
    fontWeight: '700',
  },
  modeButtonTextActive: {
    color: '#E9F4FF',
  },
  contentEditor: {
    minHeight: 240,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30455F',
    backgroundColor: '#111D2B',
    color: '#EAF1FB',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  previewWrap: {
    minHeight: 240,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#30455F',
    backgroundColor: '#111D2B',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewBody: {
    color: '#EAF1FB',
    fontSize: 14,
  },
  previewH1: {
    color: '#F1F8FF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewH2: {
    color: '#E8F3FF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 7,
  },
  previewH3: {
    color: '#DEEEFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewParagraph: {
    color: '#D7E6F7',
    lineHeight: 22,
    marginBottom: 8,
  },
  previewList: {
    marginBottom: 8,
  },
  previewListItem: {
    color: '#D7E6F7',
  },
  previewInlineCode: {
    color: '#CDE5FF',
    backgroundColor: '#1A3048',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  previewCodeBlock: {
    color: '#CDE5FF',
    backgroundColor: '#0D1724',
    borderColor: '#30455F',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  previewQuote: {
    color: '#C8DDF4',
    borderLeftColor: '#4F83B1',
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 8,
  },
  previewLink: {
    color: '#8BC4FF',
  },
  dangerButton: {
    borderRadius: 10,
    backgroundColor: '#3A171D',
    borderColor: '#6D2D37',
    borderWidth: 1,
    paddingVertical: 10,
    marginTop: 4,
  },
  dangerLabel: {
    color: '#FFDEE3',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
});