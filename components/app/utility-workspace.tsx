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

import { AppState, makeId, makeSequentialUntitledName } from '@/lib/app-model';
import { SHORTCUTS } from '@/lib/shortcut-config';

interface UtilityWorkspaceProps {
  state: AppState;
  onChange: (next: AppState) => void;
  externalSelectedSkillId?: string | null;
  onConsumedExternalSelection?: () => void;
  onOpenLinkedArea?: (areaId: string) => void;
  worldInfo?: {
    name: string;
    isDirty: boolean;
    stats: {
      areas: number;
      journals: number;
      backpack: number;
      skills: number;
    };
  } | null;
  onSaveWorld?: () => void;
  onCloseWorld?: () => void;
}

type UtilityTab = 'skills' | 'options';
type UtilityOptionCategory = 'world' | 'keyboard-shortcuts';

export function UtilityWorkspace({
  state,
  onChange,
  externalSelectedSkillId,
  onConsumedExternalSelection,
  onOpenLinkedArea,
  worldInfo,
  onSaveWorld,
  onCloseWorld,
}: UtilityWorkspaceProps) {
  const [tab, setTab] = useState<UtilityTab>('skills');
  const [query, setQuery] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(state.skills[0]?.id ?? null);
  const [contextMenuSkillId, setContextMenuSkillId] = useState<string | null>(null);
  const [prerequisiteListExpanded, setPrerequisiteListExpanded] = useState(true);
  const [outcomeListExpanded, setOutcomeListExpanded] = useState(true);
  const [selectedOptionCategory, setSelectedOptionCategory] = useState<UtilityOptionCategory>('world');
  const tabTransition = useRef(new Animated.Value(1)).current;
  const skillEditorTransition = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    tabTransition.setValue(0.98);
    Animated.timing(tabTransition, {
      toValue: 1,
      duration: 130,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [tab, tabTransition]);

  useEffect(() => {
    skillEditorTransition.setValue(0.98);
    Animated.timing(skillEditorTransition, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [selectedSkillId, skillEditorTransition]);

  const selectedSkill = useMemo(
    () => state.skills.find((skill) => skill.id === selectedSkillId) ?? null,
    [selectedSkillId, state.skills]
  );

  const filteredSkills = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return state.skills;
    }
    return state.skills.filter((skill) => `${skill.name} ${skill.description}`.toLowerCase().includes(needle));
  }, [query, state.skills]);

  const shortcutGroups = useMemo(() => {
    const groups: Record<string, typeof SHORTCUTS> = {};
    for (const item of SHORTCUTS) {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    }
    return groups;
  }, []);

  const skillUsage = useMemo(() => {
    const prerequisiteFor: {
      skillId: string;
      areaId: string;
      areaName: string;
      gateId: string;
      gateName: string;
      level: 'fundamental' | 'intermediate' | 'advanced';
      recommendationLevel: 0 | 1 | 2 | 3 | 4 | 5;
    }[] = [];

    const outcomeFrom: {
      skillId: string;
      areaId: string;
      areaName: string;
      gateId: string;
      gateName: string;
      level: 'fundamental' | 'intermediate' | 'advanced';
    }[] = [];

    const visitAreas = (areas: AppState['world']) => {
      for (const area of areas) {
        for (const gate of area.gates) {
          for (const prerequisite of gate.prerequisites) {
            if (prerequisite.type === 'skill') {
              prerequisiteFor.push({
                skillId: prerequisite.id,
                areaId: area.id,
                areaName: area.name,
                gateId: gate.id,
                gateName: gate.name || gate.id,
                level: prerequisite.level,
                recommendationLevel: prerequisite.recommendation_level,
              });
            }
          }

          for (const outcome of gate.outcomes) {
            outcomeFrom.push({
              skillId: outcome.id,
              areaId: area.id,
              areaName: area.name,
              gateId: gate.id,
              gateName: gate.name || gate.id,
              level: outcome.level,
            });
          }
        }

        if (area.subareas.length > 0) {
          visitAreas(area.subareas);
        }
      }
    };

    visitAreas(state.world);
    return { prerequisiteFor, outcomeFrom };
  }, [state.world]);

  const prerequisiteForSelectedSkill = useMemo(
    () => skillUsage.prerequisiteFor.filter((usage) => usage.skillId === selectedSkillId),
    [selectedSkillId, skillUsage.prerequisiteFor]
  );

  const outcomeFromSelectedSkill = useMemo(
    () => skillUsage.outcomeFrom.filter((usage) => usage.skillId === selectedSkillId),
    [selectedSkillId, skillUsage.outcomeFrom]
  );

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
    if (!externalSelectedSkillId) {
      return;
    }
    if (!state.skills.some((skill) => skill.id === externalSelectedSkillId)) {
      onConsumedExternalSelection?.();
      return;
    }

    setTab('skills');
    setSelectedSkillId(externalSelectedSkillId);
    onConsumedExternalSelection?.();
  }, [externalSelectedSkillId, onConsumedExternalSelection, state.skills]);

  const addSkill = () => {
    const name = newSkillName.trim();
    const fallbackName = makeSequentialUntitledName(
      state.skills.map((skill) => skill.name),
      'Untitled Skill'
    );

    const id = makeId('skill');
    onChange({
      ...state,
      skills: [
        ...state.skills,
        {
          id,
          name: name || fallbackName,
          description: '',
        },
      ],
    });
    setNewSkillName('');
    setSelectedSkillId(id);
  };

  const patchSkill = (patch: Partial<{ name: string; description: string }>) => {
    if (!selectedSkillId) {
      return;
    }

    onChange({
      ...state,
      skills: state.skills.map((skill) =>
        skill.id === selectedSkillId
          ? {
              ...skill,
              ...patch,
            }
          : skill
      ),
    });
  };

  const removeSelectedSkill = () => {
    if (!selectedSkillId) {
      return;
    }

    removeSkillById(selectedSkillId);
  };

  const removeSkillById = (skillId: string) => {
    if (!state.skills.some((skill) => skill.id === skillId)) {
      return;
    }

    const nextSkills = state.skills.filter((skill) => skill.id !== skillId);
    onChange({
      ...state,
      skills: nextSkills,
    });
    setSelectedSkillId((current) => (current === skillId ? (nextSkills[0]?.id ?? null) : current));
    setContextMenuSkillId(null);
  };

  return (
    <View style={styles.root}>
      <View style={styles.leftPane}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.title}>Utility Console</Text>
          <Text style={styles.sidebarSubtitle}>Skills, shortcuts, and operational settings</Text>
        </View>

        <View style={styles.tabRow}>
          <Pressable onPress={() => setTab('skills')} style={[styles.tabButton, tab === 'skills' && styles.tabButtonActive]}>
            <Text style={[styles.tabLabel, tab === 'skills' && styles.tabLabelActive]}>Skills</Text>
          </Pressable>
          <Pressable onPress={() => setTab('options')} style={[styles.tabButton, tab === 'options' && styles.tabButtonActive]}>
            <Text style={[styles.tabLabel, tab === 'options' && styles.tabLabelActive]}>Options</Text>
          </Pressable>
        </View>

        <Animated.View
          style={{
            flex: 1,
            opacity: tabTransition,
            transform: [
              {
                translateY: tabTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
            ],
          }}>
        {tab === 'skills' ? (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Skills: {state.skills.length}</Text>
              <Text style={styles.summaryText}>Visible: {filteredSkills.length}</Text>
            </View>
            <View style={styles.controls}>
              <TextInput
                onChangeText={setQuery}
                placeholder="Search skills"
                placeholderTextColor="#8393A9"
                style={styles.input}
                value={query}
              />
            </View>

            <View style={styles.controls}>
              <TextInput
                onChangeText={setNewSkillName}
                placeholder="New skill"
                placeholderTextColor="#8393A9"
                style={styles.input}
                value={newSkillName}
              />
              <Pressable onPress={addSkill} style={styles.primaryButton}>
                <Text style={styles.primaryLabel}>Add</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
              {filteredSkills.length === 0 ? <Text style={styles.listEmptyText}>No matching skills.</Text> : null}
              {filteredSkills.map((skill) => {
                const active = selectedSkillId === skill.id;
                return (
                  <Pressable
                    {...({
                      onContextMenu: (event: any) => {
                        event.preventDefault?.();
                        setContextMenuSkillId(skill.id);
                      },
                    } as any)}
                    key={skill.id}
                    onLongPress={() => setContextMenuSkillId(skill.id)}
                    onPress={() => setSelectedSkillId(skill.id)}
                    style={[styles.card, active && styles.cardActive]}>
                    <Text style={styles.cardTitle}>{skill.name || 'Untitled Skill'}</Text>
                    <Text numberOfLines={2} style={styles.cardText}>
                      {skill.description || 'No description'}
                    </Text>
                    {contextMenuSkillId === skill.id ? (
                      <View style={styles.inlineMenu}>
                        <Pressable onPress={() => setSelectedSkillId(skill.id)} style={styles.inlineMenuButton}>
                          <Text style={styles.inlineMenuLabel}>Open</Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            confirmDelete('Delete this skill? This cannot be undone in current session.', () =>
                              removeSkillById(skill.id)
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
          </>
        ) : (
          <View style={styles.optionsMenuWrap}>
            <Text style={styles.optionsMenuTitle}>Options Categories</Text>
            <Pressable
              onPress={() => setSelectedOptionCategory('world')}
              style={[styles.optionsMenuItem, selectedOptionCategory === 'world' && styles.optionsMenuItemActive]}>
              <Text
                style={[
                  styles.optionsMenuItemLabel,
                  selectedOptionCategory === 'world' && styles.optionsMenuItemLabelActive,
                ]}>
                World
              </Text>
              <Text style={styles.optionsMenuItemMeta}>Metadata + lifecycle actions</Text>
            </Pressable>

            <Pressable
              onPress={() => setSelectedOptionCategory('keyboard-shortcuts')}
              style={[
                styles.optionsMenuItem,
                selectedOptionCategory === 'keyboard-shortcuts' && styles.optionsMenuItemActive,
              ]}>
              <Text
                style={[
                  styles.optionsMenuItemLabel,
                  selectedOptionCategory === 'keyboard-shortcuts' && styles.optionsMenuItemLabelActive,
                ]}>
                Keyboard Shortcut
              </Text>
              <Text style={styles.optionsMenuItemMeta}>Read-only (MVP)</Text>
            </Pressable>
          </View>
        )}
        </Animated.View>
      </View>

      <View style={styles.editorPane}>
        <Animated.View
          style={{
            flex: 1,
            opacity: tabTransition,
            transform: [
              {
                translateY: tabTransition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [6, 0],
                }),
              },
            ],
          }}>
        {tab === 'skills' ? (
          !selectedSkill ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>Select or create a skill from the left panel.</Text>
            </View>
          ) : (
              <Animated.View
                style={{
                  flex: 1,
                  opacity: skillEditorTransition,
                  transform: [
                    {
                      translateY: skillEditorTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [6, 0],
                      }),
                    },
                  ],
                }}>
              <ScrollView contentContainerStyle={styles.editorCard}>
              <Text style={styles.label}>Skill Name</Text>
              <TextInput
                onChangeText={(value) => patchSkill({ name: value })}
                placeholder="Skill name"
                placeholderTextColor="#8393A9"
                style={styles.input}
                value={selectedSkill.name}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                multiline
                onChangeText={(value) => patchSkill({ description: value })}
                placeholder="Describe this skill"
                placeholderTextColor="#8393A9"
                style={[styles.input, styles.textArea]}
                value={selectedSkill.description}
              />

              <View style={styles.optionsGroupCard}>
                <Pressable
                  onPress={() => {
                    setPrerequisiteListExpanded((current) => !current);
                  }}
                  style={styles.usageSectionToggle}>
                  <Text style={styles.optionsGroupTitle}>Prerequisite For ({prerequisiteForSelectedSkill.length})</Text>
                  <Text style={styles.usageSectionToggleChevron}>{prerequisiteListExpanded ? '▴' : '▾'}</Text>
                </Pressable>

                {prerequisiteListExpanded ? (
                  prerequisiteForSelectedSkill.length === 0 ? (
                    <Text style={styles.placeholderText}>This skill is not used as a prerequisite by any gate yet.</Text>
                  ) : (
                    <ScrollView style={styles.usageListScroll} contentContainerStyle={styles.usageListContent}>
                      {prerequisiteForSelectedSkill.map((usage, index) => (
                        <View key={`${usage.gateId}_${usage.areaId}_${index}`} style={styles.listCard}>
                          <Text style={styles.cardTitle}>{usage.gateName}</Text>
                          <Text style={styles.cardText}>Area: {usage.areaName}</Text>
                          <Text style={styles.cardText}>Level: {usage.level}</Text>
                          <Text style={styles.cardText}>Recommendation: {usage.recommendationLevel}</Text>
                          <Pressable onPress={() => onOpenLinkedArea?.(usage.areaId)} style={styles.inlineMenuButton}>
                            <Text style={styles.inlineMenuLabel}>Open Area in Map</Text>
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  )
                ) : null}
              </View>

              <View style={styles.optionsGroupCard}>
                <Pressable
                  onPress={() => {
                    setOutcomeListExpanded((current) => !current);
                  }}
                  style={styles.usageSectionToggle}>
                  <Text style={styles.optionsGroupTitle}>Outcome From ({outcomeFromSelectedSkill.length})</Text>
                  <Text style={styles.usageSectionToggleChevron}>{outcomeListExpanded ? '▴' : '▾'}</Text>
                </Pressable>

                {outcomeListExpanded ? (
                  outcomeFromSelectedSkill.length === 0 ? (
                    <Text style={styles.placeholderText}>This skill is not produced as an outcome by any gate yet.</Text>
                  ) : (
                    <ScrollView style={styles.usageListScroll} contentContainerStyle={styles.usageListContent}>
                      {outcomeFromSelectedSkill.map((usage, index) => (
                        <View key={`${usage.gateId}_${usage.areaId}_outcome_${index}`} style={styles.listCard}>
                          <Text style={styles.cardTitle}>{usage.gateName}</Text>
                          <Text style={styles.cardText}>Area: {usage.areaName}</Text>
                          <Text style={styles.cardText}>Level: {usage.level}</Text>
                          <Pressable onPress={() => onOpenLinkedArea?.(usage.areaId)} style={styles.inlineMenuButton}>
                            <Text style={styles.inlineMenuLabel}>Open Area in Map</Text>
                          </Pressable>
                        </View>
                      ))}
                    </ScrollView>
                  )
                ) : null}
              </View>

              <Pressable
                onPress={() =>
                  confirmDelete('Delete this skill? This cannot be undone in current session.', removeSelectedSkill)
                }
                style={styles.dangerButton}>
                <Text style={styles.dangerLabel}>Delete Skill</Text>
              </Pressable>
            </ScrollView>
            </Animated.View>
          )
        ) : (
          <ScrollView contentContainerStyle={styles.optionsContentWrap}>
            {selectedOptionCategory === 'keyboard-shortcuts' ? (
              <>
                <View style={styles.placeholderWrap}>
                  <Text style={styles.placeholderTitle}>Keyboard Shortcut</Text>
                  <Text style={styles.placeholderText}>
                    This category is currently preview-only for MVP. Editing bindings will be added later.
                  </Text>
                </View>

                {Object.entries(shortcutGroups).map(([group, items]) => (
                  <View key={group} style={styles.optionsGroupCard}>
                    <Text style={styles.optionsGroupTitle}>{group}</Text>
                    {items.map((item) => (
                      <View key={item.action} style={styles.shortcutRow}>
                        <View style={styles.shortcutInfo}>
                          <Text style={styles.shortcutLabel}>{item.label}</Text>
                          <Text style={styles.shortcutDescription}>{item.description}</Text>
                        </View>
                        <Text style={styles.shortcutKeys}>{item.keys}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </>
            ) : null}

            {selectedOptionCategory === 'world' ? (
              <View style={styles.optionsGroupCard}>
                <Text style={styles.optionsGroupTitle}>Active World</Text>
                {worldInfo ? (
                  <>
                    <View style={styles.worldRow}>
                      <Text style={styles.worldLabel}>Folder</Text>
                      <Text style={styles.worldValue}>{worldInfo.name}</Text>
                    </View>
                    <View style={styles.worldStatsGrid}>
                      <View style={styles.worldStatCard}>
                        <Text style={styles.worldStatValue}>{worldInfo.stats.areas}</Text>
                        <Text style={styles.worldStatLabel}>Areas</Text>
                      </View>
                      <View style={styles.worldStatCard}>
                        <Text style={styles.worldStatValue}>{worldInfo.stats.journals}</Text>
                        <Text style={styles.worldStatLabel}>Journals</Text>
                      </View>
                      <View style={styles.worldStatCard}>
                        <Text style={styles.worldStatValue}>{worldInfo.stats.backpack}</Text>
                        <Text style={styles.worldStatLabel}>Items</Text>
                      </View>
                      <View style={styles.worldStatCard}>
                        <Text style={styles.worldStatValue}>{worldInfo.stats.skills}</Text>
                        <Text style={styles.worldStatLabel}>Skills</Text>
                      </View>
                    </View>
                    <View style={styles.worldRow}>
                      <Text style={styles.worldLabel}>Status</Text>
                      <Text style={styles.worldValue}>{worldInfo.isDirty ? 'Unsaved changes' : 'Saved'}</Text>
                    </View>

                    <View style={styles.worldActionsRow}>
                      <Pressable onPress={onSaveWorld} style={styles.primaryButton}>
                        <Text style={styles.primaryLabel}>Save World</Text>
                      </Pressable>
                      <Pressable onPress={onCloseWorld} style={styles.inlineDangerButton}>
                        <Text style={styles.inlineDangerLabel}>Close World</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={styles.placeholderText}>No active world is open right now.</Text>
                )}
              </View>
            ) : null}
          </ScrollView>
        )}
        </Animated.View>
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
    width: 320,
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3950',
    backgroundColor: '#0F1722',
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderColor: '#73C5FF',
    backgroundColor: '#132A42',
  },
  tabLabel: {
    color: '#B9C8DB',
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#EAF6FF',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  summaryText: {
    color: '#92A6BE',
    fontSize: 11,
    fontWeight: '600',
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
  cardText: {
    color: '#B7C5D8',
    fontSize: 12,
  },
  listCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#324A67',
    backgroundColor: '#111C2A',
    padding: 8,
    gap: 6,
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
  placeholderWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B3A4E',
    backgroundColor: '#0E1623',
    padding: 10,
    gap: 6,
  },
  optionsMenuWrap: {
    gap: 8,
  },
  optionsMenuTitle: {
    color: '#AAC0D7',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionsMenuItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A3950',
    backgroundColor: '#0F1722',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 2,
  },
  optionsMenuItemActive: {
    borderColor: '#73C5FF',
    backgroundColor: '#132A42',
  },
  optionsMenuItemLabel: {
    color: '#D1DFEE',
    fontSize: 12,
    fontWeight: '700',
  },
  optionsMenuItemLabelActive: {
    color: '#EAF6FF',
  },
  optionsMenuItemMeta: {
    color: '#8EA5BE',
    fontSize: 11,
  },
  optionsContentWrap: {
    gap: 10,
    paddingBottom: 24,
  },
  optionsGroupCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#25364D',
    backgroundColor: '#101826',
    padding: 10,
    gap: 8,
  },
  optionsGroupTitle: {
    color: '#D6EAFE',
    fontSize: 13,
    fontWeight: '700',
  },
  usageSectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  usageSectionToggleChevron: {
    color: '#A8C3DF',
    fontSize: 12,
    fontWeight: '700',
  },
  usageListScroll: {
    maxHeight: 220,
  },
  usageListContent: {
    gap: 8,
    paddingBottom: 2,
  },
  shortcutRow: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#2D405A',
    backgroundColor: '#111C2B',
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  shortcutInfo: {
    flex: 1,
    gap: 2,
  },
  shortcutLabel: {
    color: '#E5F0FD',
    fontSize: 12,
    fontWeight: '700',
  },
  shortcutDescription: {
    color: '#9CB2C8',
    fontSize: 11,
  },
  shortcutKeys: {
    color: '#CFE4FF',
    fontSize: 11,
    fontWeight: '800',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#355577',
    backgroundColor: '#13243A',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  placeholderTitle: {
    color: '#DDEBFC',
    fontSize: 13,
    fontWeight: '700',
  },
  placeholderText: {
    color: '#9CB2C8',
    fontSize: 12,
    lineHeight: 18,
  },
  worldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  worldLabel: {
    color: '#8FA7C2',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  worldValue: {
    color: '#E3EEFC',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  worldStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  worldStatCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D405A',
    backgroundColor: '#111C2B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 110,
    gap: 2,
  },
  worldStatValue: {
    color: '#EAF5FF',
    fontSize: 15,
    fontWeight: '800',
  },
  worldStatLabel: {
    color: '#9DB2C8',
    fontSize: 11,
    fontWeight: '600',
  },
  worldActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  editorPane: {
    flex: 1,
    padding: 18,
    backgroundColor: '#090F18',
  },
  editorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B3A4E',
    backgroundColor: '#0D1623',
    padding: 12,
    gap: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#9AA9BC',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 20,
  },
  label: {
    color: '#AAC0D7',
    fontSize: 12,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
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
