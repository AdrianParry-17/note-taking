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

interface JournalWorkspaceProps {
  state: AppState;
  onChange: (next: AppState) => void;
  externalSelectedJournalId?: string | null;
  onConsumedExternalSelection?: () => void;
  onOpenLinkedArea?: (areaId: string) => void;
}

export function JournalWorkspace({
  state,
  onChange,
  externalSelectedJournalId,
  onConsumedExternalSelection,
  onOpenLinkedArea,
}: JournalWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [newJournalName, setNewJournalName] = useState('');
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(state.journals[0]?.id ?? null);
  const [contextMenuJournalId, setContextMenuJournalId] = useState<string | null>(null);
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
  }, [editorTransition, selectedJournalId]);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) {
      return state.journals;
    }
    return state.journals.filter((journal) => {
      const base = `${journal.name} ${journal.description} ${journal.tags.join(' ')}`.toLowerCase();
      return base.includes(lower);
    });
  }, [query, state.journals]);

  const selected = useMemo(
    () => state.journals.find((journal) => journal.id === selectedJournalId) ?? null,
    [selectedJournalId, state.journals]
  );
  const selectedContent = selected ? state.journalContentById[selected.id] ?? '' : '';

  const selectedWordCount = useMemo(() => {
    const words = selectedContent
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return words.length;
  }, [selectedContent]);

  const selectedReadMinutes = Math.max(1, Math.ceil(selectedWordCount / 180));

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
    if (!externalSelectedJournalId) {
      return;
    }

    if (!state.journals.some((journal) => journal.id === externalSelectedJournalId)) {
      onConsumedExternalSelection?.();
      return;
    }

    setSelectedJournalId(externalSelectedJournalId);
    onConsumedExternalSelection?.();
  }, [externalSelectedJournalId, onConsumedExternalSelection, state.journals]);

  useEffect(() => {
    setTagsDraft(selected?.tags.join(', ') ?? '');
  }, [selected?.id, selected?.tags]);

  useEffect(() => {
    if (!selected || !selected.area) {
      return;
    }

    const exists = findAreaById(state.world, selected.area);
    if (exists) {
      return;
    }

    onChange({
      ...state,
      journals: state.journals.map((journal) =>
        journal.id === selected.id
          ? {
              ...journal,
              area: null,
            }
          : journal
      ),
    });
  }, [onChange, selected, state]);

  const areaOptions = useMemo(
    () =>
      flattenAreasWithPath(state.world).map((area) => ({
        value: area.id,
        label: area.name,
        subtitle: area.pathLabel,
      })),
    [state.world]
  );

  const updateJournal = (patch: Partial<(typeof state.journals)[number]>) => {
    if (!selected) {
      return;
    }
    onChange({
      ...state,
      journals: state.journals.map((journal) =>
        journal.id === selected.id
          ? {
              ...journal,
              ...patch,
            }
          : journal
      ),
    });
  };

  const updateJournalContent = (content: string) => {
    if (!selected) {
      return;
    }
    onChange({
      ...state,
      journalContentById: {
        ...state.journalContentById,
        [selected.id]: content,
      },
    });
  };

  const createJournal = () => {
    const entered = newJournalName.trim();
    const fallbackName = makeSequentialUntitledName(
      state.journals.map((journal) => journal.name),
      'Untitled Journal'
    );
    const id = makeId('journal');
    const next = {
      id,
      area: null,
      name: entered || fallbackName,
      description: '',
      tags: [],
    };
    onChange({
      ...state,
      journals: [next, ...state.journals],
      journalContentById: {
        ...state.journalContentById,
        [id]: '# New Journal\n\n',
      },
    });
    setSelectedJournalId(id);
    setNewJournalName('');
  };

  const deleteJournalById = (journalId: string) => {
    const target = state.journals.find((journal) => journal.id === journalId);
    if (!target) {
      return;
    }
    const nextJournals = state.journals.filter((journal) => journal.id !== journalId);
    const nextContent = { ...state.journalContentById };
    delete nextContent[journalId];

    onChange({
      ...state,
      journals: nextJournals,
      journalContentById: nextContent,
    });
    setSelectedJournalId((current) => (current === journalId ? (nextJournals[0]?.id ?? null) : current));
    setContextMenuJournalId(null);
  };

  const deleteSelected = () => {
    if (!selected) {
      return;
    }
    deleteJournalById(selected.id);
  };

  return (
    <View style={styles.root}>
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.title}>Journal Navigator</Text>
          <Text style={styles.sidebarSubtitle}>Contextual + general notes for your journey map</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryText}>Total: {state.journals.length}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryText}>Visible: {filtered.length}</Text>
          </View>
        </View>
        <View style={styles.controls}>
          <TextInput
            onChangeText={setQuery}
            placeholder="Filter journals by name, tag, description"
            placeholderTextColor="#8693A9"
            style={styles.input}
            value={query}
          />
        </View>
        <View style={styles.controls}>
          <TextInput
            onChangeText={setNewJournalName}
            placeholder="New journal name"
            placeholderTextColor="#8693A9"
            style={styles.input}
            value={newJournalName}
          />
          <Pressable onPress={createJournal} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Add</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <Text style={styles.listEmptyText}>
              {state.journals.length === 0
                ? 'No journals yet. Create your first journal from this panel or use Ctrl+Shift+J.'
                : 'No matching journals.'}
            </Text>
          ) : null}
          {filtered.map((journal) => {
            const active = journal.id === selectedJournalId;
            const areaName = journal.area ? findAreaById(state.world, journal.area)?.name ?? '<Unknown Area>' : 'General';

            return (
              <Pressable
                {...({
                  onContextMenu: (event: any) => {
                    event.preventDefault?.();
                    setContextMenuJournalId(journal.id);
                  },
                } as any)}
                key={journal.id}
                onLongPress={() => setContextMenuJournalId(journal.id)}
                onPress={() => setSelectedJournalId(journal.id)}
                style={[styles.item, active && styles.itemActive]}>
                <Text style={styles.itemTitle}>{journal.name}</Text>
                <Text style={styles.itemMeta}>{areaName}</Text>
                <Text style={styles.itemDescription} numberOfLines={2}>
                  {journal.description || 'No description'}
                </Text>
                {contextMenuJournalId === journal.id ? (
                  <View style={styles.inlineMenu}>
                    <Pressable onPress={() => setSelectedJournalId(journal.id)} style={styles.inlineMenuButton}>
                      <Text style={styles.inlineMenuLabel}>Open</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        confirmDelete('Delete this journal? This cannot be undone in current session.', () =>
                          deleteJournalById(journal.id)
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
              {state.journals.length === 0
                ? 'Journal is empty. Add a journal on the left, then write in Edit mode.'
                : 'Select a journal on the left to start writing.'}
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
            <View style={styles.editorHeaderCard}>
              <Text style={styles.editorTitle}>{selected.name || 'Untitled Journal'}</Text>
              <View style={styles.editorMetaRow}>
                <Text style={styles.editorMeta}>Words: {selectedWordCount}</Text>
                <Text style={styles.editorMeta}>Read: ~{selectedReadMinutes} min</Text>
                <Text style={styles.editorMeta}>Tags: {selected.tags.length}</Text>
              </View>
            </View>

            <View style={styles.metaGrid}>
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
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <TextInput
                      onChangeText={(value) => updateJournal({ name: value })}
                      style={styles.input}
                      value={selected.name}
                    />
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Area (optional)</Text>
                    <SearchComboBox
                      allowClear
                      nullLabel="General note (no area)"
                      onChange={(value) => updateJournal({ area: value })}
                      options={areaOptions}
                      placeholder="Select area"
                      value={selected.area}
                    />
                    {selected.area ? (
                      <Pressable onPress={() => onOpenLinkedArea?.(selected.area as string)} style={styles.inlineMenuButton}>
                        <Text style={styles.inlineMenuLabel}>Open Linked Area in Map</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Tags (comma separated)</Text>
                    <TextInput
                      onBlur={() =>
                        updateJournal({
                          tags: tagsDraft
                            .split(',')
                            .map((item) => item.trim())
                            .filter(Boolean),
                        })
                      }
                      onChangeText={setTagsDraft}
                      placeholder="map, gate, reflection"
                      placeholderTextColor="#8693A9"
                      style={styles.input}
                      value={tagsDraft}
                    />
                  </View>

                  <View style={styles.fieldWrapGrow}>
                    <Text style={styles.fieldLabel}>Description</Text>
                    <TextInput
                      multiline
                      onChangeText={(value) => updateJournal({ description: value })}
                      style={[styles.input, styles.textArea]}
                      value={selected.description}
                    />
                  </View>

                  <Pressable
                    onPress={() =>
                      confirmDelete('Delete this journal? This cannot be undone in current session.', deleteSelected)
                    }
                    style={styles.dangerButton}>
                    <Text style={styles.dangerButtonLabel}>Delete Journal</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <View style={styles.editorWrap}>
              <View style={styles.editorHeaderRow}>
                <Text style={styles.fieldLabel}>Markdown Content</Text>
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
                  onChangeText={updateJournalContent}
                  placeholder="# Write here..."
                  placeholderTextColor="#8693A9"
                  style={styles.editorInput}
                  value={selectedContent}
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
                    {selectedContent || '_Empty journal. Switch to Edit mode to start writing._'}
                  </Markdown>
                </ScrollView>
              )}
            </View>
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
  sidebar: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: '#243246',
    backgroundColor: '#0C1017',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
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
  primaryButtonLabel: {
    color: '#EAF6FF',
    fontWeight: '700',
    fontSize: 12,
  },
  list: {
    gap: 8,
    paddingBottom: 20,
  },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A384C',
    backgroundColor: '#111B29',
    padding: 10,
    gap: 4,
  },
  itemActive: {
    borderColor: '#73C5FF',
    backgroundColor: '#132A42',
  },
  itemTitle: {
    color: '#E6EEF9',
    fontSize: 13,
    fontWeight: '700',
  },
  itemMeta: {
    color: '#9CB2C8',
    fontSize: 11,
    fontWeight: '600',
  },
  itemDescription: {
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
    gap: 14,
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
  metaGrid: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B3A4E',
    backgroundColor: '#0D1623',
    padding: 12,
    gap: 10,
  },
  fieldWrap: {
    gap: 6,
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
  fieldWrapGrow: {
    gap: 6,
    minHeight: 88,
  },
  fieldLabel: {
    color: '#AAC0D7',
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 78,
  },
  dangerButton: {
    borderRadius: 10,
    backgroundColor: '#3A171D',
    borderColor: '#6D2D37',
    borderWidth: 1,
    paddingVertical: 10,
  },
  dangerButtonLabel: {
    color: '#FFDEE3',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  editorWrap: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B3A4E',
    backgroundColor: '#0D1623',
    padding: 12,
    gap: 8,
  },
  editorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
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
  editorInput: {
    flex: 1,
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
    flex: 1,
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
});