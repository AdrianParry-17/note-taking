import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BackpackWorkspace } from '@/components/app/backpack-workspace';
import { CommandPalette, type CommandPaletteItem } from '@/components/app/command-palette';
import { JournalWorkspace } from '@/components/app/journal-workspace';
import { LeftSidebar, type AppSection } from '@/components/app/left-sidebar';
import { MapWorkspace } from '@/components/app/map-workspace';
import { ShortcutBadge } from '@/components/app/shortcut-badge';
import { UtilityWorkspace } from '@/components/app/utility-workspace';
import { flattenAreasWithPath, type AppState, initialState, makeId, makeSequentialUntitledName } from '@/lib/app-model';
import { makeWorldTemplateState, type WorldTemplateId } from '@/lib/world-templates';
import {
  directoryHasFile,
  directoryHasWorldJson,
  initializeWorldDirectory,
  isWorldStorageSupported,
  loadWorldFromDirectory,
  pickWorldDirectory,
  saveWorldToDirectory,
} from '@/lib/world-storage';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  section: AppSection;
  focusType: 'area' | 'journal' | 'backpack' | 'skill';
}

export default function HomeScreen() {
  const [section, setSection] = useState<AppSection>('map');
  const [state, setState] = useState<AppState>(initialState);
  const [worldDirectoryHandle, setWorldDirectoryHandle] = useState<any | null>(null);
  const [worldName, setWorldName] = useState<string | null>(null);
  const [worldDirty, setWorldDirty] = useState(false);
  const [worldBusy, setWorldBusy] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalSearchFocused, setGlobalSearchFocused] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{ type: SearchResultItem['focusType']; id: string } | null>(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [pendingCreateDirectoryHandle, setPendingCreateDirectoryHandle] = useState<any | null>(null);
  const [selectedTemplateDraft, setSelectedTemplateDraft] = useState<WorldTemplateId | null>(null);
  const globalSearchInputRef = useRef<TextInput | null>(null);
  const sectionTransition = useRef({
    map: new Animated.Value(1),
    journal: new Animated.Value(0),
    backpack: new Animated.Value(0),
    utility: new Animated.Value(0),
  }).current;

  useEffect(() => {
    const animations = (Object.keys(sectionTransition) as AppSection[]).map((key) =>
      Animated.timing(sectionTransition[key], {
        toValue: section === key ? 1 : 0,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    Animated.parallel(animations).start();
  }, [section, sectionTransition]);

  const sectionTitle = useMemo(() => {
    if (section === 'map') {
      return 'Journey Map';
    }
    if (section === 'journal') {
      return 'Journal Editor';
    }
    if (section === 'backpack') {
      return 'Backpack';
    }
    return 'Utility / Other Stuff';
  }, [section]);

  const stats = useMemo(
    () => ({
      areas: flattenAreasWithPath(state.world).length,
      journals: state.journals.length,
      backpack: Object.keys(state.backpack).length,
      skills: state.skills.length,
    }),
    [state]
  );

  const activeWorldLabel = useMemo(() => {
    if (!worldName) {
      return 'No world open';
    }
    return worldDirty ? `${worldName} • Unsaved` : `${worldName} • Saved`;
  }, [worldDirty, worldName]);

  const setNextState = useCallback(
    (next: AppState) => {
      setState(next);
      if (worldDirectoryHandle) {
        setWorldDirty(true);
      }
    },
    [worldDirectoryHandle]
  );

  const updateState = useCallback(
    (updater: (previous: AppState) => AppState) => {
      setState((previous) => updater(previous));
      if (worldDirectoryHandle) {
        setWorldDirty(true);
      }
    },
    [worldDirectoryHandle]
  );

  const focusGlobalSearch = useCallback(() => {
    setCommandPaletteOpen(false);
    setGlobalSearchFocused(true);
    globalSearchInputRef.current?.focus();
  }, []);

  const quickCreateJournal = useCallback(() => {
    if (!worldDirectoryHandle) {
      return;
    }

    const id = makeId('journal');
    const fallbackName = makeSequentialUntitledName(
      state.journals.map((journal) => journal.name),
      'Untitled Journal'
    );

    updateState((previous) => ({
      ...previous,
      journals: [
        {
          id,
          area: null,
          name: fallbackName,
          description: '',
          tags: ['quick-capture'],
        },
        ...previous.journals,
      ],
      journalContentById: {
        ...previous.journalContentById,
        [id]: '# New Journal\n\n',
      },
    }));

    setSection('journal');
    setFocusTarget({ type: 'journal', id });
  }, [state.journals, updateState, worldDirectoryHandle]);

  const quickCreateBackpackItem = useCallback(() => {
    if (!worldDirectoryHandle) {
      return;
    }

    const id = makeId('backpack');
    const fallbackName = makeSequentialUntitledName(
      Object.values(state.backpack).map((item) => item.name),
      'Untitled Item'
    );

    updateState((previous) => ({
      ...previous,
      backpack: {
        ...previous.backpack,
        [id]: {
          id,
          area: null,
          name: fallbackName,
          descriptions: '',
          content: '',
          tags: ['quick-capture'],
        },
      },
    }));

    setSection('backpack');
    setFocusTarget({ type: 'backpack', id });
  }, [state.backpack, updateState, worldDirectoryHandle]);

  const quickCreateSkill = useCallback(() => {
    if (!worldDirectoryHandle) {
      return;
    }

    const id = makeId('skill');
    const fallbackName = makeSequentialUntitledName(
      state.skills.map((skill) => skill.name),
      'Untitled Skill'
    );

    updateState((previous) => ({
      ...previous,
      skills: [
        ...previous.skills,
        {
          id,
          name: fallbackName,
          description: '',
        },
      ],
    }));

    setSection('utility');
    setFocusTarget({ type: 'skill', id });
  }, [state.skills, updateState, worldDirectoryHandle]);

  const confirmAction = useCallback((message: string): boolean => {
    if (typeof (globalThis as any).confirm === 'function') {
      return (globalThis as any).confirm(message);
    }
    Alert.alert('Confirmation required', message);
    return false;
  }, []);

  const showMessage = useCallback((title: string, message: string) => {
    if (typeof (globalThis as any).alert === 'function') {
      (globalThis as any).alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const openWorld = useCallback(async () => {
    if (worldBusy) {
      return;
    }
    if (!isWorldStorageSupported()) {
      showMessage('Unsupported environment', 'Open/Create world requires browser File System Access API support.');
      return;
    }

    setWorldBusy(true);
    try {
      const directory = await pickWorldDirectory();
      if (!directory) {
        return;
      }

      const loaded = await loadWorldFromDirectory(directory);
      setState(loaded.state);
      setWorldDirectoryHandle(directory);
      setWorldName(directory.name ?? 'Untitled World');
      setWorldDirty(false);
      setSection('map');
      setFocusTarget(null);
      if (loaded.diagnostics.length > 0) {
        showMessage('Loaded with warnings', loaded.diagnostics.join('\n'));
      }
    } catch (error) {
      showMessage('Open world failed', error instanceof Error ? error.message : 'Unknown error while opening world.');
    } finally {
      setWorldBusy(false);
    }
  }, [showMessage, worldBusy]);

  const createWorld = useCallback(async () => {
    if (worldBusy || templateMenuOpen) {
      return;
    }
    if (!isWorldStorageSupported()) {
      showMessage('Unsupported environment', 'Open/Create world requires browser File System Access API support.');
      return;
    }

    setWorldBusy(true);
    try {
      const directory = await pickWorldDirectory();
      if (!directory) {
        return;
      }

      const hasAnyWorldJson = await directoryHasFile(directory, 'world.json');
      const hasValidWorld = hasAnyWorldJson ? await directoryHasWorldJson(directory) : false;
      if (hasAnyWorldJson) {
        const warning = hasValidWorld
          ? 'Selected folder already has a valid world.json. Create World will overwrite current data files. Continue?'
          : 'Selected folder has a world.json file but it is invalid. Create World will overwrite it. Continue?';
        if (!confirmAction(warning)) {
          return;
        }
      }
      setPendingCreateDirectoryHandle(directory);
      setSelectedTemplateDraft('blank');
      setTemplateMenuOpen(true);
    } catch (error) {
      showMessage('Create world failed', error instanceof Error ? error.message : 'Unknown error while creating world.');
    } finally {
      setWorldBusy(false);
    }
  }, [confirmAction, showMessage, templateMenuOpen, worldBusy]);

  const selectWorldTemplate = useCallback(
    async (templateId: WorldTemplateId) => {
      if (!pendingCreateDirectoryHandle || worldBusy) {
        return;
      }

      setWorldBusy(true);
      try {
        const templateState = makeWorldTemplateState(templateId);
        await initializeWorldDirectory(pendingCreateDirectoryHandle, templateState);

        setState(templateState);
        setWorldDirectoryHandle(pendingCreateDirectoryHandle);
        setWorldName(pendingCreateDirectoryHandle.name ?? 'Untitled World');
        setWorldDirty(false);
        setSection('map');
        setFocusTarget(null);
        setTemplateMenuOpen(false);
        setPendingCreateDirectoryHandle(null);
      } catch (error) {
        showMessage('Create world failed', error instanceof Error ? error.message : 'Unknown error while creating world.');
      } finally {
        setWorldBusy(false);
      }
    },
    [pendingCreateDirectoryHandle, showMessage, worldBusy]
  );

  const cancelWorldTemplateSelection = useCallback(() => {
    if (worldBusy) {
      return;
    }
    setTemplateMenuOpen(false);
    setPendingCreateDirectoryHandle(null);
    setSelectedTemplateDraft(null);
  }, [worldBusy]);

  const createWorldFromTemplateSelection = useCallback(() => {
    if (!selectedTemplateDraft || worldBusy) {
      return;
    }
    void selectWorldTemplate(selectedTemplateDraft);
  }, [selectedTemplateDraft, selectWorldTemplate, worldBusy]);

  const saveWorld = useCallback(async () => {
    if (!worldDirectoryHandle || worldBusy) {
      return;
    }

    setWorldBusy(true);
    try {
      const saved = await saveWorldToDirectory(worldDirectoryHandle, state);
      setWorldDirty(false);
      if (saved.warnings.length > 0) {
        showMessage('Saved with warnings', saved.warnings.join('\n'));
      }
    } catch (error) {
      showMessage('Save world failed', error instanceof Error ? error.message : 'Unknown error while saving world.');
    } finally {
      setWorldBusy(false);
    }
  }, [showMessage, state, worldBusy, worldDirectoryHandle]);

  const closeWorld = useCallback(() => {
    if (worldBusy) {
      return;
    }
    if (worldDirty && !confirmAction('You have unsaved changes. Close world without saving?')) {
      return;
    }

    setWorldDirectoryHandle(null);
    setWorldName(null);
    setWorldDirty(false);
    setState(initialState);
    setSection('map');
    setFocusTarget(null);
    setGlobalQuery('');
    setGlobalSearchFocused(false);
    setCommandPaletteOpen(false);
  }, [confirmAction, worldBusy, worldDirty]);

  const openAreaInMap = useCallback((areaId: string) => {
    setSection('map');
    setFocusTarget({ type: 'area', id: areaId });
  }, []);

  const globalResults = useMemo(() => {
    const needle = globalQuery.trim().toLowerCase();
    if (!needle) {
      return [] as SearchResultItem[];
    }

    const areaResults: SearchResultItem[] = flattenAreasWithPath(state.world)
      .filter((area) => `${area.name} ${area.pathLabel}`.toLowerCase().includes(needle))
      .map((area) => ({
        id: area.id,
        title: area.name,
        subtitle: `Area • ${area.pathLabel}`,
        section: 'map',
        focusType: 'area',
      }));

    const journalResults: SearchResultItem[] = state.journals
      .filter((journal) => `${journal.name} ${journal.description} ${journal.tags.join(' ')}`.toLowerCase().includes(needle))
      .map((journal) => ({
        id: journal.id,
        title: journal.name,
        subtitle: `Journal • ${journal.tags.join(', ') || 'No tags'}`,
        section: 'journal',
        focusType: 'journal',
      }));

    const backpackResults: SearchResultItem[] = Object.values(state.backpack)
      .filter((item) => `${item.name} ${item.descriptions} ${item.content} ${item.tags.join(' ')}`.toLowerCase().includes(needle))
      .map((item) => ({
        id: item.id,
        title: item.name,
        subtitle: `Backpack • ${item.tags.join(', ') || 'No tags'}`,
        section: 'backpack',
        focusType: 'backpack',
      }));

    const skillResults: SearchResultItem[] = state.skills
      .filter((skill) => `${skill.name} ${skill.description}`.toLowerCase().includes(needle))
      .map((skill) => ({
        id: skill.id,
        title: skill.name,
        subtitle: `Skill • ${skill.description || 'No description'}`,
        section: 'utility',
        focusType: 'skill',
      }));

    return [...areaResults, ...journalResults, ...backpackResults, ...skillResults].slice(0, 10);
  }, [globalQuery, state.backpack, state.journals, state.skills, state.world]);

  const commandPaletteCommands = useMemo<CommandPaletteItem[]>(
    () => [
      {
        id: 'focus_search',
        title: 'Focus Global Search',
        subtitle: 'Search area, journal, backpack, and skills from one place.',
        keys: 'Ctrl+K',
        keywords: 'find lookup search everything',
        onSelect: () => {
          setTimeout(() => {
            focusGlobalSearch();
          }, 20);
        },
      },
      {
        id: 'save_world',
        title: 'Save Active World',
        subtitle: 'Write world.json, journals, backpack, and gate notes to selected folder.',
        keys: 'Ctrl+S',
        keywords: 'save persist write disk world',
        onSelect: () => {
          if (!worldDirectoryHandle) {
            showMessage('No active world', 'Open or create a world first.');
            return;
          }
          saveWorld();
        },
      },
      {
        id: 'go_map',
        title: 'Open Journey Map',
        subtitle: 'Go to map canvas and area inspector.',
        keys: 'Alt+1',
        keywords: 'map graph area world',
        onSelect: () => setSection('map'),
      },
      {
        id: 'go_journal',
        title: 'Open Journal Workspace',
        subtitle: 'Go to journals list and markdown editor.',
        keys: 'Alt+2',
        keywords: 'journal notes markdown',
        onSelect: () => setSection('journal'),
      },
      {
        id: 'go_backpack',
        title: 'Open Backpack Workspace',
        subtitle: 'Go to dump/inventory items.',
        keys: 'Alt+3',
        keywords: 'backpack inventory snippets',
        onSelect: () => setSection('backpack'),
      },
      {
        id: 'go_utility',
        title: 'Open Utility Workspace',
        subtitle: 'Go to skills and keyboard options.',
        keys: 'Alt+4',
        keywords: 'utility skills options settings',
        onSelect: () => setSection('utility'),
      },
      {
        id: 'quick_journal',
        title: 'Quick Create Journal',
        subtitle: 'Create a blank general journal and open it immediately.',
        keys: 'Ctrl+Shift+J',
        keywords: 'new journal create quick capture',
        onSelect: () => {
          if (!worldDirectoryHandle) {
            showMessage('No active world', 'Open or create a world first.');
            return;
          }
          quickCreateJournal();
        },
      },
      {
        id: 'quick_backpack',
        title: 'Quick Create Backpack Item',
        subtitle: 'Create a general backpack item and open it immediately.',
        keys: 'Ctrl+Shift+B',
        keywords: 'new backpack create quick capture',
        onSelect: () => {
          if (!worldDirectoryHandle) {
            showMessage('No active world', 'Open or create a world first.');
            return;
          }
          quickCreateBackpackItem();
        },
      },
      {
        id: 'quick_skill',
        title: 'Quick Create Skill',
        subtitle: 'Create a new skill record and open it in Utility.',
        keys: 'Ctrl+Shift+S',
        keywords: 'new skill create',
        onSelect: () => {
          if (!worldDirectoryHandle) {
            showMessage('No active world', 'Open or create a world first.');
            return;
          }
          quickCreateSkill();
        },
      },
    ],
    [
      focusGlobalSearch,
      quickCreateBackpackItem,
      quickCreateJournal,
      quickCreateSkill,
      saveWorld,
      showMessage,
      worldDirectoryHandle,
    ]
  );

  useEffect(() => {
    const doc = (globalThis as any).document as Document | undefined;
    if (!doc?.addEventListener) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasMeta = event.ctrlKey || event.metaKey;

      if (key === 'escape') {
        if (commandPaletteOpen || globalSearchFocused || globalQuery) {
          event.preventDefault();
          setCommandPaletteOpen(false);
          setGlobalSearchFocused(false);
          setGlobalQuery('');
          globalSearchInputRef.current?.blur();
        }
        return;
      }

      if (hasMeta && key === 'k') {
        event.preventDefault();
        focusGlobalSearch();
        return;
      }

      if (hasMeta && key === 'p') {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      if (hasMeta && !event.shiftKey && key === 's') {
        event.preventDefault();
        if (!worldDirectoryHandle) {
          showMessage('No active world', 'Open or create a world first.');
          return;
        }
        saveWorld();
        return;
      }

      if (event.altKey && key === '1') {
        event.preventDefault();
        setSection('map');
        return;
      }

      if (event.altKey && key === '2') {
        event.preventDefault();
        setSection('journal');
        return;
      }

      if (event.altKey && key === '3') {
        event.preventDefault();
        setSection('backpack');
        return;
      }

      if (event.altKey && key === '4') {
        event.preventDefault();
        setSection('utility');
        return;
      }

      if (hasMeta && event.shiftKey && key === 'j') {
        event.preventDefault();
        if (!worldDirectoryHandle) {
          showMessage('No active world', 'Open or create a world first.');
          return;
        }
        quickCreateJournal();
        return;
      }

      if (hasMeta && event.shiftKey && key === 'b') {
        event.preventDefault();
        if (!worldDirectoryHandle) {
          showMessage('No active world', 'Open or create a world first.');
          return;
        }
        quickCreateBackpackItem();
        return;
      }

      if (hasMeta && event.shiftKey && key === 's') {
        event.preventDefault();
        if (!worldDirectoryHandle) {
          showMessage('No active world', 'Open or create a world first.');
          return;
        }
        quickCreateSkill();
      }
    };

    doc.addEventListener('keydown', onKeyDown);
    return () => {
      doc.removeEventListener('keydown', onKeyDown);
    };
  }, [
    commandPaletteOpen,
    focusGlobalSearch,
    globalQuery,
    globalSearchFocused,
    quickCreateBackpackItem,
    quickCreateJournal,
    quickCreateSkill,
    saveWorld,
    showMessage,
    worldDirectoryHandle,
  ]);

  return (
    <View style={styles.page}>
      <LeftSidebar onChangeSection={setSection} section={section} />

      <View style={styles.workspace}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTop}>
              <Text style={styles.title}>{sectionTitle}</Text>
              <Text style={styles.subtitle}>{activeWorldLabel}</Text>
              <View style={styles.worldNameRow}>
                <Text style={styles.worldNameLabel}>World</Text>
                <Text numberOfLines={1} style={styles.worldNameValue}>
                  {worldName ?? '—'}
                </Text>
              </View>
            </View>
            <View style={styles.quickActionsRow}>
              <Text style={styles.quickActionLabel}>Actions</Text>
              <ShortcutBadge
                onPress={() => setCommandPaletteOpen(true)}
                shortcut="Ctrl+P"
              />
              <ShortcutBadge onPress={focusGlobalSearch} shortcut="Ctrl+K" />
              {worldDirectoryHandle ? <ShortcutBadge onPress={saveWorld} shortcut="Ctrl+S" /> : null}
            </View>
          </View>

          <View style={styles.globalSearchWrap}>
            <TextInput
              ref={globalSearchInputRef}
              onChangeText={setGlobalQuery}
              onFocus={() => setGlobalSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  setGlobalSearchFocused(false);
                }, 120);
              }}
              {...({
                onKeyPress: (event: any) => {
                  if (event?.nativeEvent?.key === 'Escape') {
                    setGlobalQuery('');
                    setGlobalSearchFocused(false);
                    globalSearchInputRef.current?.blur();
                  }
                },
              } as any)}
              placeholder="Search everything: areas, journals, backpack, skills"
              placeholderTextColor="#8393A9"
              style={styles.globalSearchInput}
              value={globalQuery}
            />
            {globalSearchFocused && globalResults.length > 0 ? (
              <View style={styles.searchResultsWrap}>
                <ScrollView style={styles.searchResultsScroll}>
                  {globalResults.map((result) => (
                    <Pressable
                      key={`${result.focusType}_${result.id}`}
                      onPress={() => {
                        setSection(result.section);
                        setFocusTarget({ type: result.focusType, id: result.id });
                        setGlobalQuery('');
                        setGlobalSearchFocused(false);
                        globalSearchInputRef.current?.blur();
                      }}
                      style={styles.searchResultItem}>
                      <View style={styles.searchResultMain}>
                        <Text style={styles.searchResultTitle}>{result.title}</Text>
                        <Text numberOfLines={1} style={styles.searchResultSubtitle}>
                          {result.subtitle}
                        </Text>
                      </View>
                      <Text style={styles.searchResultSection}>{result.section}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>

        </View>

        <View style={styles.content}>
          {!worldDirectoryHandle ? (
            <View style={styles.startMenuWrap}>
              <View style={styles.startMenuCard}>
                <Text style={styles.startMenuTitle}>Open or Create a World</Text>
                <Text style={styles.startMenuText}>
                  Select a folder containing a valid world.json, or create a new world in a chosen folder.
                </Text>

                <View style={styles.startMenuActions}>
                  <Pressable disabled={worldBusy} onPress={openWorld} style={styles.startMenuPrimaryButton}>
                    <Text style={styles.startMenuPrimaryLabel}>{worldBusy ? 'Working…' : 'Open Existing World'}</Text>
                  </Pressable>
                  <Pressable disabled={worldBusy} onPress={createWorld} style={styles.startMenuSecondaryButton}>
                    <Text style={styles.startMenuSecondaryLabel}>{worldBusy ? 'Working…' : 'Create New World'}</Text>
                  </Pressable>
                </View>

                <Text style={styles.startMenuHint}>
                  Requirement: File System Access API (supported in modern Chromium-based browsers).
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View
                pointerEvents={section === 'map' ? 'auto' : 'none'}
                style={[styles.sectionPane, section === 'map' ? styles.sectionPaneVisible : styles.sectionPaneHidden]}>
                <Animated.View
                  pointerEvents={section === 'map' ? 'auto' : 'none'}
                  style={[
                    styles.sectionMotionPane,
                    {
                      opacity: sectionTransition.map,
                      transform: [
                        {
                          translateY: sectionTransition.map.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 0],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <MapWorkspace
                    externalSelectedAreaId={focusTarget?.type === 'area' ? focusTarget.id : null}
                    onChange={setNextState}
                    onConsumedExternalSelection={() => setFocusTarget(null)}
                    onOpenLinkedBackpackItem={(itemId) => {
                      setSection('backpack');
                      setFocusTarget({ type: 'backpack', id: itemId });
                    }}
                    onOpenLinkedJournal={(journalId) => {
                      setSection('journal');
                      setFocusTarget({ type: 'journal', id: journalId });
                    }}
                    onOpenLinkedSkill={(skillId) => {
                      setSection('utility');
                      setFocusTarget({ type: 'skill', id: skillId });
                    }}
                    state={state}
                  />
                </Animated.View>
              </View>
              <View
                pointerEvents={section === 'journal' ? 'auto' : 'none'}
                style={[styles.sectionPane, section === 'journal' ? styles.sectionPaneVisible : styles.sectionPaneHidden]}>
                <Animated.View
                  pointerEvents={section === 'journal' ? 'auto' : 'none'}
                  style={[
                    styles.sectionMotionPane,
                    {
                      opacity: sectionTransition.journal,
                      transform: [
                        {
                          translateY: sectionTransition.journal.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 0],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <JournalWorkspace
                    externalSelectedJournalId={focusTarget?.type === 'journal' ? focusTarget.id : null}
                    onChange={setNextState}
                    onConsumedExternalSelection={() => setFocusTarget(null)}
                    onOpenLinkedArea={openAreaInMap}
                    state={state}
                  />
                </Animated.View>
              </View>
              <View
                pointerEvents={section === 'backpack' ? 'auto' : 'none'}
                style={[styles.sectionPane, section === 'backpack' ? styles.sectionPaneVisible : styles.sectionPaneHidden]}>
                <Animated.View
                  pointerEvents={section === 'backpack' ? 'auto' : 'none'}
                  style={[
                    styles.sectionMotionPane,
                    {
                      opacity: sectionTransition.backpack,
                      transform: [
                        {
                          translateY: sectionTransition.backpack.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 0],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <BackpackWorkspace
                    externalSelectedItemId={focusTarget?.type === 'backpack' ? focusTarget.id : null}
                    onChange={setNextState}
                    onConsumedExternalSelection={() => setFocusTarget(null)}
                    onOpenLinkedArea={openAreaInMap}
                    state={state}
                  />
                </Animated.View>
              </View>
              <View
                pointerEvents={section === 'utility' ? 'auto' : 'none'}
                style={[styles.sectionPane, section === 'utility' ? styles.sectionPaneVisible : styles.sectionPaneHidden]}>
                <Animated.View
                  pointerEvents={section === 'utility' ? 'auto' : 'none'}
                  style={[
                    styles.sectionMotionPane,
                    {
                      opacity: sectionTransition.utility,
                      transform: [
                        {
                          translateY: sectionTransition.utility.interpolate({
                            inputRange: [0, 1],
                            outputRange: [8, 0],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <UtilityWorkspace
                    externalSelectedSkillId={focusTarget?.type === 'skill' ? focusTarget.id : null}
                    onChange={setNextState}
                    onCloseWorld={closeWorld}
                    onConsumedExternalSelection={() => setFocusTarget(null)}
                    onOpenLinkedArea={openAreaInMap}
                    onSaveWorld={saveWorld}
                    state={state}
                    worldInfo={{
                      name: worldName ?? 'Untitled World',
                      isDirty: worldDirty,
                      stats,
                    }}
                  />
                </Animated.View>
              </View>
            </>
          )}
        </View>
      </View>

      <CommandPalette commands={commandPaletteCommands} onClose={() => setCommandPaletteOpen(false)} open={commandPaletteOpen} />

      {templateMenuOpen ? (
        <View style={styles.templateOverlay}>
          <Pressable onPress={cancelWorldTemplateSelection} style={styles.templateOverlayDismiss} />
          <View style={styles.templateCard}>
            <Text style={styles.templateTitle}>Choose World Template</Text>
            <Text style={styles.templateText}>
              Select a starter template for this world. You can always edit everything after creation.
            </Text>

            <Pressable
              disabled={worldBusy}
              onPress={() => setSelectedTemplateDraft('blank')}
              style={[
                styles.templateOption,
                styles.templateOptionPrimary,
                selectedTemplateDraft === 'blank' ? styles.templateOptionActive : null,
              ]}>
              <Text style={styles.templateOptionTitle}>Blank World</Text>
              <Text style={styles.templateOptionText}>Start with an empty map and build from scratch.</Text>
            </Pressable>

            <Pressable
              disabled={worldBusy}
              onPress={() => setSelectedTemplateDraft('tutorial')}
              style={[
                styles.templateOption,
                styles.templateOptionSecondary,
                selectedTemplateDraft === 'tutorial' ? styles.templateOptionActive : null,
              ]}>
              <Text style={styles.templateOptionTitle}>Tutorial World</Text>
              <Text style={styles.templateOptionText}>Start with guided areas, gates, journals, and sample roads.</Text>
            </Pressable>

            <View style={styles.templateActionsRow}>
              <Pressable disabled={worldBusy} onPress={cancelWorldTemplateSelection} style={styles.templateCancelButton}>
                <Text style={styles.templateCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={worldBusy || !selectedTemplateDraft}
                onPress={createWorldFromTemplateSelection}
                style={[
                  styles.templateCreateButton,
                  (worldBusy || !selectedTemplateDraft) ? styles.templateCreateButtonDisabled : null,
                ]}>
                <Text style={styles.templateCreateText}>{worldBusy ? 'Creating…' : 'Create'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#05070B',
  },
  workspace: {
    flex: 1,
    backgroundColor: '#080B10',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A38',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#090F17',
    gap: 8,
    zIndex: 40,
    elevation: 40,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTop: {
    gap: 2,
    flex: 1,
  },
  title: {
    color: '#F0F7FF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#90A6BF',
    fontSize: 12,
    marginTop: 4,
  },
  worldNameRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  worldNameLabel: {
    color: '#9CB2C8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  worldNameValue: {
    color: '#DBECFF',
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#355577',
    backgroundColor: '#13243A',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 300,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickActionLabel: {
    color: '#B9CEE5',
    fontSize: 11,
    fontWeight: '700',
  },
  globalSearchWrap: {
    position: 'relative',
    zIndex: 50,
  },
  globalSearchInput: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A384A',
    backgroundColor: '#0E1520',
    color: '#E4ECF8',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchResultsWrap: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A384A',
    backgroundColor: '#0B121C',
    zIndex: 80,
    elevation: 80,
    maxHeight: 260,
  },
  searchResultsScroll: {
    padding: 8,
  },
  searchResultItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#25354A',
    backgroundColor: '#101A28',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultMain: {
    flex: 1,
    gap: 2,
  },
  searchResultTitle: {
    color: '#EAF2FD',
    fontSize: 13,
    fontWeight: '700',
  },
  searchResultSubtitle: {
    color: '#9CB2C8',
    fontSize: 11,
  },
  searchResultSection: {
    color: '#CFE6FF',
    fontSize: 10,
    fontWeight: '700',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#33567B',
    backgroundColor: '#13273D',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    zIndex: 1,
    position: 'relative',
  },
  startMenuWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  startMenuCard: {
    width: '100%',
    maxWidth: 620,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A3950',
    backgroundColor: '#0D1521',
    padding: 16,
    gap: 10,
  },
  startMenuTitle: {
    color: '#EFF7FF',
    fontSize: 18,
    fontWeight: '800',
  },
  startMenuText: {
    color: '#A5BCD4',
    fontSize: 13,
    lineHeight: 20,
  },
  startMenuActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  startMenuPrimaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F7FBA',
    backgroundColor: '#114D83',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  startMenuPrimaryLabel: {
    color: '#EAF6FF',
    fontSize: 12,
    fontWeight: '700',
  },
  startMenuSecondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#35536F',
    backgroundColor: '#132233',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  startMenuSecondaryLabel: {
    color: '#D7EAFE',
    fontSize: 12,
    fontWeight: '700',
  },
  startMenuHint: {
    marginTop: 4,
    color: '#8199B3',
    fontSize: 11,
    lineHeight: 17,
  },
  sectionPane: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionMotionPane: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionPaneVisible: {
    display: 'flex',
  },
  sectionPaneHidden: {
    display: 'flex',
  },
  templateOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 400,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(5, 9, 15, 0.64)',
  },
  templateOverlayDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  templateCard: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3D56',
    backgroundColor: '#0E1724',
    padding: 14,
    gap: 10,
  },
  templateTitle: {
    color: '#EEF6FF',
    fontSize: 17,
    fontWeight: '800',
  },
  templateText: {
    color: '#A8BED5',
    fontSize: 12,
    lineHeight: 18,
  },
  templateOption: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  templateOptionPrimary: {
    borderColor: '#3C8DCF',
    backgroundColor: '#135084',
  },
  templateOptionSecondary: {
    borderColor: '#35506F',
    backgroundColor: '#132338',
  },
  templateOptionActive: {
    borderColor: '#79CCFF',
    shadowColor: '#79CCFF',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  templateOptionTitle: {
    color: '#EAF6FF',
    fontSize: 13,
    fontWeight: '700',
  },
  templateOptionText: {
    color: '#B7CEE6',
    fontSize: 11,
    lineHeight: 16,
  },
  templateActionsRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  templateCancelButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#465C75',
    backgroundColor: '#15263A',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  templateCancelText: {
    color: '#D6E8FB',
    fontSize: 12,
    fontWeight: '700',
  },
  templateCreateButton: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2F7FBA',
    backgroundColor: '#114D83',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  templateCreateButtonDisabled: {
    opacity: 0.55,
  },
  templateCreateText: {
    color: '#EAF6FF',
    fontSize: 12,
    fontWeight: '700',
  },
});