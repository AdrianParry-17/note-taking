import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  PanResponder,
  PanResponderGestureState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  forceCenter,
  forceCollide,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  Simulation,
  SimulationNodeDatum,
} from 'd3-force';

import {
  AreaNode,
  AppState,
  createArea,
  deleteAreaById,
  findAreaById,
  Gate,
  GATE_MARK_COLORS,
  getAreaMark,
  getGateMark,
  makeId,
  makeSequentialUntitledName,
  makeGateNoteKey,
  MARK_COLORS,
  updateAreaById,
} from '@/lib/app-model';
import { SearchComboBox } from '@/components/app/search-combobox';

interface MapWorkspaceProps {
  state: AppState;
  onChange: (next: AppState) => void;
  externalSelectedAreaId?: string | null;
  onConsumedExternalSelection?: () => void;
  onOpenLinkedJournal?: (journalId: string) => void;
  onOpenLinkedBackpackItem?: (itemId: string) => void;
  onOpenLinkedSkill?: (skillId: string) => void;
}

interface FloatingNode extends SimulationNodeDatum {
  id: string;
  label: string;
  kind: 'area' | 'structure';
  isolated: boolean;
  markColor: string;
  radius: number;
  homeX: number;
  homeY: number;
}

const CANVAS_WIDTH = 1020;
const CANVAS_HEIGHT = 660;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

function findAreaContainerPath(nodes: AreaNode[], targetAreaId: string, parentPath: string[] = []): string[] | null {
  for (const area of nodes) {
    if (area.id === targetAreaId) {
      return parentPath;
    }

    const nested = findAreaContainerPath(area.subareas, targetAreaId, [...parentPath, area.id]);
    if (nested) {
      return nested;
    }
  }
  return null;
}

function arePathsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function getScopeNodes(world: AreaNode[], path: string[]): AreaNode[] {
  if (path.length === 0) {
    return world;
  }

  const current = findAreaById(world, path[path.length - 1]);
  return current?.subareas ?? [];
}

function makeAnchor(index: number, total: number, area: AreaNode): { x: number; y: number } {
  const section = area.isolated ? 2 : area.kind === 'structure' ? 1 : 0;
  const sectionOffsetX = [-130, 120, 0][section];
  const sectionOffsetY = [-50, 55, -140][section];

  const spread = Math.max(total, 1);
  const angle = (Math.PI * 2 * index) / spread;
  const ring = 150 + (index % 3) * 34;

  return {
    x: CENTER_X + sectionOffsetX + Math.cos(angle) * ring,
    y: CENTER_Y + sectionOffsetY + Math.sin(angle) * ring,
  };
}

function FloatingMapNode({
  node,
  selected,
  onPress,
  onDoublePress,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  node: FloatingNode;
  selected: boolean;
  onPress: () => void;
  onDoublePress: () => void;
  onDragStart: () => void;
  onDragMove: (gesture: PanResponderGestureState) => void;
  onDragEnd: () => void;
}) {
  const lastTapAt = useRef(0);
  const draggingRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          draggingRef.current = false;
        },
        onPanResponderMove: (_, gesture) => {
          if (!draggingRef.current && (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6)) {
            draggingRef.current = true;
            onDragStart();
          }

          if (draggingRef.current) {
            onDragMove(gesture);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (draggingRef.current) {
            onDragEnd();
            draggingRef.current = false;
            return;
          }

          if (Math.abs(gesture.dx) < 8 && Math.abs(gesture.dy) < 8) {
            const now = Date.now();
            if (now - lastTapAt.current < 340) {
              onDoublePress();
            } else {
              onPress();
            }
            lastTapAt.current = now;
          }
        },
        onPanResponderTerminate: () => {
          if (draggingRef.current) {
            onDragEnd();
            draggingRef.current = false;
          }
        },
      }),
    [onDoublePress, onDragEnd, onDragMove, onDragStart, onPress]
  );

  const x = node.x ?? node.homeX;
  const y = node.y ?? node.homeY;
  const isStructure = node.kind === 'structure';
  const isIsolatedArea = node.kind === 'area' && node.isolated;
  const isNormalArea = node.kind === 'area' && !node.isolated;

  return (
    <View
      style={[
        styles.nodeWrap,
        {
          left: x - node.radius,
          top: y - node.radius,
          width: node.radius * 2,
        },
      ]}
      {...panResponder.panHandlers}>
      <View
        style={[
          styles.nodeCircle,
          isStructure && styles.nodeCircleStructure,
          isIsolatedArea && styles.nodeCircleIsolated,
          isNormalArea && styles.nodeCircleArea,
          {
            width: node.radius * 2,
            height: node.radius * 2,
            borderRadius: node.radius,
            borderColor: selected ? '#8AD0FF' : node.markColor,
            borderWidth: selected ? 4 : 3,
          },
        ]}>
      </View>
      <Text numberOfLines={1} style={styles.nodeLabel}>
        {node.label}
      </Text>
    </View>
  );
}

export function MapWorkspace({
  state,
  onChange,
  externalSelectedAreaId,
  onConsumedExternalSelection,
  onOpenLinkedJournal,
  onOpenLinkedBackpackItem,
  onOpenLinkedSkill,
}: MapWorkspaceProps) {
  const [path, setPath] = useState<string[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [nodes, setNodes] = useState<FloatingNode[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(state.roads[0]?.id ?? null);
  const [areaDetailsExpanded, setAreaDetailsExpanded] = useState(true);
  const [areaMarkExpanded, setAreaMarkExpanded] = useState(false);
  const [gatesExpanded, setGatesExpanded] = useState(true);
  const [gateDetailsExpanded, setGateDetailsExpanded] = useState(true);
  const [roadsExpanded, setRoadsExpanded] = useState(false);
  const [gateTab, setGateTab] = useState<'prerequisites' | 'outcomes'>('prerequisites');
  const [expandedRoadSteps, setExpandedRoadSteps] = useState<Record<number, boolean>>({});
  const [expandedPrerequisites, setExpandedPrerequisites] = useState<Record<number, boolean>>({});
  const [expandedOutcomes, setExpandedOutcomes] = useState<Record<number, boolean>>({});

  const simulationRef = useRef<Simulation<FloatingNode, undefined> | null>(null);
  const dragStartRef = useRef<Record<string, { x: number; y: number }>>({});
  const mapViewportAnim = useRef(new Animated.Value(1)).current;

  const scopeNodes = useMemo(() => getScopeNodes(state.world, path), [state.world, path]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaId) {
      return null;
    }
    return findAreaById(state.world, selectedAreaId);
  }, [selectedAreaId, state.world]);

  const selectedGate = useMemo(() => {
    if (!selectedArea || !selectedGateId) {
      return null;
    }
    return selectedArea.gates.find((gate) => gate.id === selectedGateId) ?? null;
  }, [selectedArea, selectedGateId]);

  const selectedRoad = useMemo(
    () => state.roads.find((road) => road.id === selectedRoadId) ?? null,
    [selectedRoadId, state.roads]
  );

  const roadOptions = useMemo(
    () =>
      state.roads.map((road, index) => ({
        value: road.id,
        label: road.name || `Road ${index + 1}`,
        subtitle: road.description || `Steps: ${road.areas.length}`,
      })),
    [state.roads]
  );

  const gateOptions = useMemo(
    () =>
      (selectedArea?.gates ?? []).map((gate, index) => ({
        value: gate.id,
        label: gate.name || `Gate ${index + 1}`,
        subtitle: gate.description || gate.id,
      })),
    [selectedArea?.gates]
  );

  const areaOptions = useMemo(
    () =>
      state.world.flatMap((root) => {
        const walk = (node: AreaNode, pathNodes: string[]): { value: string; label: string; subtitle: string }[] => {
          const path = [...pathNodes, node.name];
          const current = [{ value: node.id, label: node.name, subtitle: path.join(' / ') }];
          return [...current, ...node.subareas.flatMap((sub) => walk(sub, path))];
        };
        return walk(root, []);
      }),
    [state.world]
  );

  const skillOptions = useMemo(
    () => state.skills.map((skill) => ({ value: skill.id, label: skill.name, subtitle: skill.description })),
    [state.skills]
  );

  const areaOptionById = useMemo(() => {
    const index = new Map<string, { value: string; label: string; subtitle: string }>();
    for (const option of areaOptions) {
      index.set(option.value, option);
    }
    return index;
  }, [areaOptions]);

  const skillOptionById = useMemo(() => {
    const index = new Map<string, { value: string; label: string; subtitle?: string }>();
    for (const option of skillOptions) {
      index.set(option.value, option);
    }
    return index;
  }, [skillOptions]);

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

  const notify = (title: string, message: string) => {
    if (typeof (globalThis as any).alert === 'function') {
      (globalThis as any).alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const focusAreaInMap = useCallback((targetAreaId: string): boolean => {
    const target = findAreaById(state.world, targetAreaId);
    if (!target) {
      notify('Area no longer exists', `The area '${targetAreaId}' cannot be found anymore.`);
      return false;
    }

    const containerPath = findAreaContainerPath(state.world, targetAreaId) ?? [];
    setPath((previousPath) => (arePathsEqual(previousPath, containerPath) ? previousPath : containerPath));
    setSelectedAreaId(targetAreaId);
    setSelectedGateId(null);
    return true;
  }, [state.world]);

  useEffect(() => {
    mapViewportAnim.setValue(0.97);
    Animated.timing(mapViewportAnim, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [mapViewportAnim, path]);

  useEffect(() => {
    const prepared: FloatingNode[] = scopeNodes.map((area, index) => {
      const anchor = makeAnchor(index, scopeNodes.length, area);
      return {
        id: area.id,
        label: area.name,
        kind: area.kind,
        isolated: area.isolated,
        markColor: MARK_COLORS[getAreaMark(state.marking.area, area.id)],
        radius: area.kind === 'structure' ? 24 : area.isolated ? 35 : 33,
        homeX: anchor.x,
        homeY: anchor.y,
        x: anchor.x,
        y: anchor.y,
      };
    });

    simulationRef.current?.stop();

    const simulation = forceSimulation(prepared)
      .alpha(1)
      .alphaDecay(0.035)
      .velocityDecay(0.28)
      .force('charge', forceManyBody().strength(-120))
      .force('center', forceCenter(CENTER_X, CENTER_Y))
      .force('collide', forceCollide<FloatingNode>().radius((node) => node.radius + 22).strength(0.95))
      .force('homeX', forceX<FloatingNode>((node) => node.homeX).strength(0.09))
      .force('homeY', forceY<FloatingNode>((node) => node.homeY).strength(0.09))
      .on('tick', () => {
        setNodes(
          prepared.map((node) => ({
            ...node,
            x: Math.max(node.radius + 10, Math.min(CANVAS_WIDTH - node.radius - 10, node.x ?? node.homeX)),
            y: Math.max(node.radius + 10, Math.min(CANVAS_HEIGHT - node.radius - 10, node.y ?? node.homeY)),
          }))
        );
      });

    simulationRef.current = simulation;
    setNodes(prepared);

    return () => {
      simulation.stop();
    };
  }, [scopeNodes, state.marking.area]);

  useEffect(() => {
    if (!state.roads.length) {
      if (selectedRoadId !== null) {
        setSelectedRoadId(null);
      }
      return;
    }

    if (!selectedRoadId || !state.roads.some((road) => road.id === selectedRoadId)) {
      setSelectedRoadId(state.roads[0].id);
    }
  }, [selectedRoadId, state.roads]);

  useEffect(() => {
    if (!externalSelectedAreaId) {
      return;
    }

    const focused = focusAreaInMap(externalSelectedAreaId);
    if (!focused) {
      onConsumedExternalSelection?.();
      return;
    }
    onConsumedExternalSelection?.();
  }, [externalSelectedAreaId, focusAreaInMap, onConsumedExternalSelection]);

  const breadcrumbItems = useMemo(() => {
    const shorten = (value: string) => (value.length > 18 ? `${value.slice(0, 15)}...` : value);

    const full = [
      { key: 'world', label: 'World', targetPath: [] as string[] },
      ...path.map((id, index) => {
        const area = findAreaById(state.world, id);
        return {
          key: id,
          label: shorten(area?.name ?? '<Unknown Area>'),
          targetPath: path.slice(0, index + 1),
        };
      }),
    ];

    if (full.length <= 3) {
      return full;
    }

    const yIndex = full.length - 2;
    const zIndex = full.length - 1;
    const parentIndexOfY = Math.max(0, yIndex - 1);

    return [
      full[0],
      {
        key: 'ellipsis',
        label: '...',
        targetPath: full[parentIndexOfY].targetPath,
      },
      full[yIndex],
      full[zIndex],
    ];
  }, [path, state.world]);

  const diveIntoArea = (areaId: string) => {
    const area = findAreaById(state.world, areaId);
    if (!area || area.kind === 'structure') {
      return;
    }

    setPath((value) => [...value, areaId]);
    setSelectedAreaId(null);
    setSelectedGateId(null);
  };

  const addToCurrentScope = (kind: 'area' | 'structure') => {
    const cleaned = newName.trim();
    const baseLabel = kind === 'area' ? 'Untitled Area' : 'Untitled Structure';
    const fallbackName = makeSequentialUntitledName(
      scopeNodes.filter((node) => node.kind === kind).map((node) => node.name),
      baseLabel
    );
    const nextName = cleaned || fallbackName;

    const created = createArea(nextName, kind);
    const nextWorld =
      path.length === 0
        ? [...state.world, created]
        : updateAreaById(state.world, path[path.length - 1], (parent) => ({
            ...parent,
            subareas: [...parent.subareas, created],
          }));

    onChange({ ...state, world: nextWorld });
    setNewName('');
  };

  const removeSelectedArea = () => {
    if (!selectedAreaId) {
      return;
    }
    const nextWorld = deleteAreaById(state.world, selectedAreaId);
    onChange({ ...state, world: nextWorld });
    setSelectedAreaId(null);
    setSelectedGateId(null);
    setPath((previous) => previous.filter((id) => id !== selectedAreaId));
  };

  const updateSelectedArea = (patch: Partial<AreaNode>) => {
    if (!selectedAreaId) {
      return;
    }
    onChange({
      ...state,
      world: updateAreaById(state.world, selectedAreaId, (area) => ({ ...area, ...patch })),
    });
  };

  const setSelectedAreaMark = (mark: keyof typeof MARK_COLORS) => {
    if (!selectedAreaId) {
      return;
    }

    const rest = state.marking.area.filter((item) => item.id !== selectedAreaId);
    if (mark === 'unexplored') {
      onChange({ ...state, marking: { ...state.marking, area: rest } });
      return;
    }

    onChange({
      ...state,
      marking: {
        ...state.marking,
        area: [
          ...rest,
          {
            id: selectedAreaId,
            mark,
            descriptions: state.marking.area.find((item) => item.id === selectedAreaId)?.descriptions ?? '',
          },
        ],
      },
    });
  };

  const updateAreaMarkDescription = (descriptions: string) => {
    if (!selectedAreaId) {
      return;
    }

    const existing = state.marking.area.find((item) => item.id === selectedAreaId);
    if (!existing) {
      return;
    }

    onChange({
      ...state,
      marking: {
        ...state.marking,
        area: state.marking.area.map((item) =>
          item.id === selectedAreaId
            ? {
                ...item,
                descriptions,
              }
            : item
        ),
      },
    });
  };

  const addGateToSelectedArea = () => {
    if (!selectedAreaId) {
      return;
    }

    const newGateId = makeId('gate');

    onChange({
      ...state,
      world: updateAreaById(state.world, selectedAreaId, (area) => ({
        ...area,
        gates: [
          ...area.gates,
          {
            id: newGateId,
            name: `Gate ${area.gates.length + 1}`,
            description: '',
            approach: '',
            prerequisites: [],
            outcomes: [],
          },
        ],
      })),
    });
    setSelectedGateId(newGateId);
  };

  const updateSelectedGate = (patch: Partial<Gate>) => {
    if (!selectedAreaId || !selectedGateId) {
      return;
    }

    onChange({
      ...state,
      world: updateAreaById(state.world, selectedAreaId, (area) => ({
        ...area,
        gates: area.gates.map((gate) =>
          gate.id === selectedGateId
            ? {
                ...gate,
                ...patch,
              }
            : gate
        ),
      })),
    });
  };

  const deleteSelectedGate = () => {
    if (!selectedAreaId || !selectedGateId) {
      return;
    }

    onChange({
      ...state,
      world: updateAreaById(state.world, selectedAreaId, (area) => ({
        ...area,
        gates: area.gates.filter((gate) => gate.id !== selectedGateId),
      })),
      marking: {
        ...state.marking,
        gate: state.marking.gate.filter((mark) => !(mark.area_id === selectedAreaId && mark.id === selectedGateId)),
      },
    });

    setSelectedGateId(null);
  };

  const addPrerequisiteToSelectedGate = () => {
    if (!selectedAreaId || !selectedGateId || !selectedGate) {
      return;
    }

    const newIndex = selectedGate.prerequisites.length;
    setExpandedPrerequisites((prev) => ({ ...prev, [newIndex]: true }));

    updateSelectedGate({
      prerequisites: [
        ...(selectedGate?.prerequisites ?? []),
        {
          id: '',
          type: 'area',
          recommendation_level: 3,
          description: '',
          level: 'fundamental',
        },
      ],
    });
  };

  const addOutcomeToSelectedGate = () => {
    if (!selectedAreaId || !selectedGateId || !selectedGate) {
      return;
    }

    const newIndex = selectedGate.outcomes.length;
    setExpandedOutcomes((prev) => ({ ...prev, [newIndex]: true }));

    updateSelectedGate({
      outcomes: [
        ...(selectedGate?.outcomes ?? []),
        {
          id: '',
          description: '',
          level: 'fundamental',
        },
      ],
    });
  };

  const patchPrerequisite = (
    index: number,
    patch: Partial<{
      id: string;
      type: 'area' | 'skill';
      recommendation_level: 0 | 1 | 2 | 3 | 4 | 5;
      description: string;
      level: 'fundamental' | 'intermediate' | 'advanced';
    }>
  ) => {
    if (!selectedGate) {
      return;
    }
    updateSelectedGate({
      prerequisites: selectedGate.prerequisites.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item
      ),
    });
  };

  const patchOutcome = (
    index: number,
    patch: Partial<{
      id: string;
      description: string;
      level: 'fundamental' | 'intermediate' | 'advanced';
    }>
  ) => {
    if (!selectedGate) {
      return;
    }
    updateSelectedGate({
      outcomes: selectedGate.outcomes.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item
      ),
    });
  };

  const removePrerequisite = (index: number) => {
    if (!selectedGate) {
      return;
    }
    updateSelectedGate({
      prerequisites: selectedGate.prerequisites.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const removeOutcome = (index: number) => {
    if (!selectedGate) {
      return;
    }
    updateSelectedGate({
      outcomes: selectedGate.outcomes.filter((_, itemIndex) => itemIndex !== index),
    });
  };

  const setSelectedGateMark = (mark: keyof typeof GATE_MARK_COLORS) => {
    if (!selectedAreaId || !selectedGateId) {
      return;
    }

    const rest = state.marking.gate.filter(
      (item) => !(item.area_id === selectedAreaId && item.id === selectedGateId)
    );

    if (mark === 'not_attempted') {
      onChange({
        ...state,
        marking: {
          ...state.marking,
          gate: rest,
        },
      });
      return;
    }

    onChange({
      ...state,
      marking: {
        ...state.marking,
        gate: [
          ...rest,
          {
            id: selectedGateId,
            area_id: selectedAreaId,
            mark,
            descriptions:
              state.marking.gate.find((item) => item.area_id === selectedAreaId && item.id === selectedGateId)
                ?.descriptions ?? '',
          },
        ],
      },
    });
  };

  const updateSelectedGateMarkDescription = (descriptions: string) => {
    if (!selectedAreaId || !selectedGateId) {
      return;
    }

    const existing = state.marking.gate.find(
      (item) => item.area_id === selectedAreaId && item.id === selectedGateId
    );
    if (!existing) {
      return;
    }

    onChange({
      ...state,
      marking: {
        ...state.marking,
        gate: state.marking.gate.map((item) =>
          item.area_id === selectedAreaId && item.id === selectedGateId
            ? {
                ...item,
                descriptions,
              }
            : item
        ),
      },
    });
  };

  const selectedGateNoteKey = useMemo(() => {
    if (!selectedAreaId || !selectedGateId) {
      return null;
    }
    return makeGateNoteKey(selectedAreaId, selectedGateId);
  }, [selectedAreaId, selectedGateId]);

  const selectedGateNote = selectedGateNoteKey ? state.gateNotes[selectedGateNoteKey] : undefined;

  const createSelectedGateNote = () => {
    if (!selectedGateNoteKey || state.gateNotes[selectedGateNoteKey] !== undefined) {
      return;
    }

    onChange({
      ...state,
      gateNotes: {
        ...state.gateNotes,
        [selectedGateNoteKey]: '',
      },
    });
  };

  const updateSelectedGateNote = (value: string) => {
    if (!selectedGateNoteKey) {
      return;
    }

    onChange({
      ...state,
      gateNotes: {
        ...state.gateNotes,
        [selectedGateNoteKey]: value,
      },
    });
  };

  const handleDragStart = (node: FloatingNode) => {
    dragStartRef.current[node.id] = {
      x: node.x ?? node.homeX,
      y: node.y ?? node.homeY,
    };

    node.fx = node.x ?? node.homeX;
    node.fy = node.y ?? node.homeY;
    simulationRef.current?.alphaTarget(0.28).restart();
  };

  const handleDragMove = (node: FloatingNode, gesture: PanResponderGestureState) => {
    const start = dragStartRef.current[node.id];
    if (!start) {
      return;
    }

    node.fx = start.x + gesture.dx;
    node.fy = start.y + gesture.dy;
    simulationRef.current?.alphaTarget(0.28).restart();
  };

  const handleDragEnd = (node: FloatingNode) => {
    delete dragStartRef.current[node.id];
    node.fx = null;
    node.fy = null;
    simulationRef.current?.alphaTarget(0.08).restart();
  };

  const createLinkedJournal = () => {
    if (!selectedArea) {
      return;
    }
    const id = makeId('journal');
    onChange({
      ...state,
      journals: [
        {
          id,
          area: selectedArea.id,
          name: `${selectedArea.name} journal`,
          description: '',
          tags: ['area-linked'],
        },
        ...state.journals,
      ],
      journalContentById: {
        ...state.journalContentById,
        [id]: `# ${selectedArea.name}\n\n`,
      },
    });
    onOpenLinkedJournal?.(id);
  };

  const createLinkedBackpackItem = () => {
    if (!selectedArea) {
      return;
    }
    const id = makeId('backpack');
    onChange({
      ...state,
      backpack: {
        ...state.backpack,
        [id]: {
          id,
          area: selectedArea.id,
          name: `${selectedArea.name} item`,
          descriptions: '',
          content: '',
          tags: ['area-linked'],
        },
      },
    });
    onOpenLinkedBackpackItem?.(id);
  };

  const createRoad = () => {
    const id = makeId('road');
    onChange({
      ...state,
      roads: [
        ...state.roads,
        {
          id,
          name: `Road ${state.roads.length + 1}`,
          description: '',
          areas: [],
        },
      ],
    });
    setSelectedRoadId(id);
  };

  const updateSelectedRoad = (patch: Partial<{ name: string; description: string }>) => {
    if (!selectedRoadId) {
      return;
    }
    onChange({
      ...state,
      roads: state.roads.map((road) =>
        road.id === selectedRoadId
          ? {
              ...road,
              ...patch,
            }
          : road
      ),
    });
  };

  const deleteSelectedRoad = () => {
    if (!selectedRoadId) {
      return;
    }
    onChange({
      ...state,
      roads: state.roads.filter((road) => road.id !== selectedRoadId),
    });
  };

  const addStepToSelectedRoad = () => {
    if (!selectedRoad) {
      return;
    }
    const newIndex = selectedRoad.areas.length;
    setExpandedRoadSteps((prev) => ({ ...prev, [newIndex]: true }));
    updateSelectedRoadSteps([
      ...selectedRoad.areas,
      {
        id: '',
        gates: [],
        description: '',
      },
    ]);
  };

  const updateSelectedRoadSteps = (areas: { id: string; gates: string[]; description: string }[]) => {
    if (!selectedRoadId) {
      return;
    }
    onChange({
      ...state,
      roads: state.roads.map((road) =>
        road.id === selectedRoadId
          ? {
              ...road,
              areas,
            }
          : road
      ),
    });
  };

  const patchRoadStep = (
    index: number,
    patch: Partial<{
      id: string;
      gates: string[];
      description: string;
    }>
  ) => {
    if (!selectedRoad) {
      return;
    }

    updateSelectedRoadSteps(
      selectedRoad.areas.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              ...patch,
            }
          : step
      )
    );
  };

  const removeRoadStep = (index: number) => {
    if (!selectedRoad) {
      return;
    }
    updateSelectedRoadSteps(selectedRoad.areas.filter((_, stepIndex) => stepIndex !== index));
  };

  const moveRoadStep = (index: number, direction: -1 | 1) => {
    if (!selectedRoad) {
      return;
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedRoad.areas.length) {
      return;
    }

    const reordered = [...selectedRoad.areas];
    const [step] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, step);
    updateSelectedRoadSteps(reordered);
  };

  const toggleRoadStepGate = (stepIndex: number, gateId: string) => {
    if (!selectedRoad) {
      return;
    }
    const step = selectedRoad.areas[stepIndex];
    if (!step) {
      return;
    }
    const hasGate = step.gates.includes(gateId);
    patchRoadStep(stepIndex, {
      gates: hasGate ? step.gates.filter((id) => id !== gateId) : [...step.gates, gateId],
    });
  };

  const roadsPanel = (
    <View style={styles.roadsPanel}>
      <Pressable
        onPress={() => {
          setRoadsExpanded((current) => !current);
        }}
        style={styles.sectionToggle}>
        <Text style={styles.sectionToggleText}>Roads ({state.roads.length})</Text>
        <Text style={styles.sectionToggleChevron}>{roadsExpanded ? '▴' : '▾'}</Text>
      </Pressable>

      {roadsExpanded ? (
        <>
          <View style={styles.rowButtons}>
            <Pressable onPress={createRoad} style={styles.buttonPrimary}>
              <Text style={styles.buttonPrimaryLabel}>New Road</Text>
            </Pressable>
            {selectedRoad ? (
              <Pressable
                onPress={() =>
                  confirmDelete('Delete this road? Steps and recommendations will be kept only if you cancel.', deleteSelectedRoad)
                }
                style={styles.buttonDanger}>
                <Text style={styles.buttonDangerLabel}>Delete Road</Text>
              </Pressable>
            ) : null}
          </View>

          {state.roads.length > 0 ? (
            <>
              <Text style={styles.label}>Select Road</Text>
              <SearchComboBox
                allowClear={false}
                onChange={(value) => {
                  if (value) {
                    setSelectedRoadId(value);
                  }
                }}
                options={roadOptions}
                placeholder="Select road"
                value={selectedRoadId}
              />
            </>
          ) : null}

          {selectedRoad ? (
            <View style={styles.roadEditorWrap}>
          <Text style={styles.label}>Road Name</Text>
          <TextInput
            onChangeText={(value) => updateSelectedRoad({ name: value })}
            style={styles.input}
            value={selectedRoad.name}
          />

          <Text style={styles.label}>Road Description</Text>
          <TextInput
            multiline
            onChangeText={(value) => updateSelectedRoad({ description: value })}
            placeholder="What this road is for"
            placeholderTextColor="#8A95A7"
            style={[styles.input, styles.textArea]}
            value={selectedRoad.description}
          />

          <View style={styles.rowButtons}>
            <Pressable onPress={addStepToSelectedRoad} style={styles.buttonSubtle}>
              <Text style={styles.buttonSubtleLabel}>Add Road Step</Text>
            </Pressable>
          </View>

              {selectedRoad.areas.map((step, index) => {
                const stepArea = step.id ? findAreaById(state.world, step.id) : null;
                const unknownStepGateIds = stepArea
                  ? step.gates.filter((gateId) => !stepArea.gates.some((gate) => gate.id === gateId))
                  : step.gates;
                const isExpanded = expandedRoadSteps[index];

                return (
                  <View key={`${selectedRoad.id}_step_${index}`} style={styles.listCard}>
                    <Pressable
                      onPress={() => setExpandedRoadSteps((prev) => ({ ...prev, [index]: !isExpanded }))}
                      style={styles.listCardToggle}>
                      <Text style={styles.listCardToggleText}>
                        Step {index + 1}: {stepArea?.name || step.id || '(Not Selected)'}
                      </Text>
                      <Text style={styles.listCardToggleChevron}>{isExpanded ? '▴' : '▾'}</Text>
                    </Pressable>

                    {isExpanded ? (
                      <View style={styles.listCardContent}>
                        <Text style={styles.label}>Select Area</Text>
                        <SearchComboBox
                          allowClear={false}
                          onChange={(value) => patchRoadStep(index, { id: value ?? '' })}
                          options={areaOptions}
                          placeholder="Select area"
                          value={step.id || null}
                        />
                        <View style={styles.rowButtons}>
                          <Pressable
                            onPress={() => {
                              if (!step.id) {
                                notify('Area not selected', 'Select a road step area first.');
                                return;
                              }
                              focusAreaInMap(step.id);
                            }}
                            style={styles.buttonSubtle}>
                            <Text style={styles.buttonSubtleLabel}>Open Step Area</Text>
                          </Pressable>
                        </View>

                        <Text style={styles.label}>Recommended Gates</Text>
                        <View style={styles.markGrid}>
                          {(stepArea?.gates ?? []).map((gate) => {
                            const active = step.gates.includes(gate.id);
                            return (
                              <Pressable
                                key={gate.id}
                                onPress={() => toggleRoadStepGate(index, gate.id)}
                                style={[styles.markChip, active && styles.markChipActive]}>
                                <Text style={styles.markText}>{gate.name || gate.id}</Text>
                              </Pressable>
                            );
                          })}
                          {!stepArea ? <Text style={styles.emptyHint}>Select an area first.</Text> : null}
                          {stepArea && stepArea.gates.length === 0 ? <Text style={styles.emptyHint}>No gates in this area.</Text> : null}
                          {step.id && !stepArea ? (
                            <Text style={styles.unknownRefText}>{`<Unknown Area: ${step.id}>`}</Text>
                          ) : null}
                          {unknownStepGateIds.map((gateId) => (
                            <Text key={`${selectedRoad.id}_${index}_unknown_${gateId}`} style={styles.unknownRefText}>{`<Unknown Gate: ${gateId}>`}</Text>
                          ))}
                        </View>

                        <Text style={styles.label}>Step Description</Text>
                        <TextInput
                          multiline
                          onChangeText={(value) => patchRoadStep(index, { description: value })}
                          placeholder="Optional note for this road step"
                          placeholderTextColor="#8A95A7"
                          style={[styles.input, styles.textArea]}
                          value={step.description}
                        />

                        <View style={styles.rowButtons}>
                          <Pressable onPress={() => moveRoadStep(index, -1)} style={styles.buttonSubtle}>
                            <Text style={styles.buttonSubtleLabel}>Move Up</Text>
                          </Pressable>
                          <Pressable onPress={() => moveRoadStep(index, 1)} style={styles.buttonSubtle}>
                            <Text style={styles.buttonSubtleLabel}>Move Down</Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              confirmDelete('Remove this road step?', () => removeRoadStep(index))
                            }
                            style={styles.listDeleteButton}>
                            <Text style={styles.listDeleteText}>Remove Step</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.main}>
        <View style={styles.topBar}>
          <ScrollView horizontal contentContainerStyle={styles.breadcrumbs} showsHorizontalScrollIndicator={false}>
            {breadcrumbItems.map((item, index) => (
              <View key={`${item.key}_${index}`} style={styles.breadcrumbItemWrap}>
                <Pressable
                  onPress={() => {
                    setPath(item.targetPath);
                    setSelectedAreaId(null);
                    setSelectedGateId(null);
                  }}
                  style={styles.crumbButton}>
                  <Text numberOfLines={1} style={styles.crumbText}>
                    {item.label}
                  </Text>
                </Pressable>
                {index < breadcrumbItems.length - 1 ? <Text style={styles.crumbSeparator}>{'>'}</Text> : null}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.toolbar}>
          <TextInput
            onChangeText={setNewName}
            placeholder="New area or structure"
            placeholderTextColor="#8A95A7"
            style={styles.input}
            value={newName}
          />
          <Pressable onPress={() => addToCurrentScope('area')} style={styles.buttonPrimary}>
            <Text style={styles.buttonPrimaryLabel}>Add Area</Text>
          </Pressable>
          <Pressable onPress={() => addToCurrentScope('structure')} style={styles.buttonSubtle}>
            <Text style={styles.buttonSubtleLabel}>Add Structure</Text>
          </Pressable>
        </View>

        <View style={styles.canvasWrap}>
          <Animated.View
            style={[
              styles.canvasFrame,
              {
                opacity: mapViewportAnim,
                transform: [{ scale: mapViewportAnim }],
              },
            ]}>
            {nodes.map((node) => (
              <FloatingMapNode
                key={node.id}
                node={node}
                onDoublePress={() => diveIntoArea(node.id)}
                onDragEnd={() => handleDragEnd(node)}
                onDragMove={(gesture) => handleDragMove(node, gesture)}
                onDragStart={() => handleDragStart(node)}
                onPress={() => {
                  setSelectedAreaId(node.id);
                  setSelectedGateId(null);
                }}
                selected={selectedAreaId === node.id}
              />
            ))}
            {nodes.length === 0 ? (
              <View style={styles.canvasEmptyOverlay}>
                <Text style={styles.canvasEmptyTitle}>This area is empty.</Text>
                <Text style={styles.canvasEmptyText}>Use Add Area or Add Structure to create your first node.</Text>
              </View>
            ) : null}
          </Animated.View>
          <Text style={styles.canvasHint}>No road connectors in MVP map mode • Double-click an area to dive</Text>
        </View>
      </View>

      <View style={styles.inspector}>
        <Text style={styles.panelTitle}>Inspector</Text>
        {!selectedArea ? (
          <ScrollView contentContainerStyle={styles.panelContent}>
            <Text style={styles.emptyHint}>Select a node to modify, mark, add gates, or delete it.</Text>
            {roadsPanel}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.panelContent}>
            <Pressable
              onPress={() => {
                setAreaDetailsExpanded((current) => !current);
              }}
              style={styles.sectionToggle}>
              <Text style={styles.sectionToggleText}>Area Details</Text>
              <Text style={styles.sectionToggleChevron}>{areaDetailsExpanded ? '▴' : '▾'}</Text>
            </Pressable>
            {areaDetailsExpanded ? (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  onChangeText={(value) => updateSelectedArea({ name: value })}
                  style={styles.input}
                  value={selectedArea.name}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  multiline
                  numberOfLines={4}
                  onChangeText={(value) => updateSelectedArea({ description: value })}
                  style={[styles.input, styles.textArea]}
                  value={selectedArea.description}
                />

                <View style={styles.rowButtons}>
                  <Pressable
                    onPress={() => updateSelectedArea({ kind: selectedArea.kind === 'area' ? 'structure' : 'area' })}
                    style={styles.buttonSubtle}>
                    <Text style={styles.buttonSubtleLabel}>
                      {selectedArea.kind === 'area' ? 'Set Structure' : 'Set Area'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateSelectedArea({ isolated: !selectedArea.isolated })}
                    style={styles.buttonSubtle}>
                    <Text style={styles.buttonSubtleLabel}>{selectedArea.isolated ? 'Unset Isolated' : 'Set Isolated'}</Text>
                  </Pressable>
                  {selectedArea.kind !== 'structure' ? (
                    <Pressable onPress={() => diveIntoArea(selectedArea.id)} style={styles.buttonSubtle}>
                      <Text style={styles.buttonSubtleLabel}>Dive In</Text>
                    </Pressable>
                  ) : null}
                </View>
              </>
            ) : null}

            <Pressable
              onPress={() => {
                setAreaMarkExpanded((current) => !current);
              }}
              style={styles.sectionToggle}>
              <Text style={styles.sectionToggleText}>Area Mark</Text>
              <Text style={styles.sectionToggleChevron}>{areaMarkExpanded ? '▴' : '▾'}</Text>
            </Pressable>
            {areaMarkExpanded ? (
              <>
                <View style={styles.markGrid}>
                  {(Object.keys(MARK_COLORS) as (keyof typeof MARK_COLORS)[]).map((mark) => {
                    const active = getAreaMark(state.marking.area, selectedArea.id) === mark;
                    return (
                      <Pressable
                        key={mark}
                        onPress={() => setSelectedAreaMark(mark)}
                        style={[styles.markChip, active && styles.markChipActive]}>
                        <View style={[styles.markDot, { backgroundColor: MARK_COLORS[mark] }]} />
                        <Text style={styles.markText}>{mark}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {getAreaMark(state.marking.area, selectedArea.id) !== 'unexplored' ? (
                  <>
                    <Text style={styles.label}>Area Mark Description</Text>
                    <TextInput
                      multiline
                      onChangeText={updateAreaMarkDescription}
                      placeholder="Why this area is marked like this"
                      placeholderTextColor="#8A95A7"
                      style={[styles.input, styles.textArea]}
                      value={
                        state.marking.area.find((item) => item.id === selectedArea.id)?.descriptions ?? ''
                      }
                    />
                  </>
                ) : null}
              </>
            ) : null}

            <Pressable
              onPress={() => {
                setGatesExpanded((current) => !current);
              }}
              style={styles.sectionToggle}>
              <Text style={styles.sectionToggleText}>Gates ({selectedArea.gates.length})</Text>
              <Text style={styles.sectionToggleChevron}>{gatesExpanded ? '▴' : '▾'}</Text>
            </Pressable>
            {gatesExpanded ? (
              <>
                <Pressable onPress={addGateToSelectedArea} style={styles.buttonPrimary}>
                  <Text style={styles.buttonPrimaryLabel}>Add Gate</Text>
                </Pressable>

                <View style={styles.rowButtons}>
                  <Pressable onPress={createLinkedJournal} style={styles.buttonSubtle}>
                    <Text style={styles.buttonSubtleLabel}>Create Linked Journal</Text>
                  </Pressable>
                  <Pressable onPress={createLinkedBackpackItem} style={styles.buttonSubtle}>
                    <Text style={styles.buttonSubtleLabel}>Create Linked Backpack Item</Text>
                  </Pressable>
                </View>

                {selectedArea.gates.length > 0 ? (
                  <>
                    <Text style={styles.label}>Select Gate</Text>
                    <SearchComboBox
                      allowClear={false}
                      onChange={(value) => {
                        if (value) {
                          setSelectedGateId(value);
                        }
                      }}
                      options={gateOptions}
                      placeholder="Select gate"
                      value={selectedGateId}
                    />
                  </>
                ) : null}

                {selectedGate ? (
                  <>
                    <Pressable
                      onPress={() => {
                        setGateDetailsExpanded((current) => !current);
                      }}
                      style={styles.sectionToggleSecondary}>
                      <Text style={styles.sectionToggleText}>Gate Details</Text>
                      <Text style={styles.sectionToggleChevron}>{gateDetailsExpanded ? '▴' : '▾'}</Text>
                    </Pressable>

                    {gateDetailsExpanded ? (
                      <>
                <Text style={styles.label}>Gate Name</Text>
                <TextInput
                  onChangeText={(value) => updateSelectedGate({ name: value })}
                  style={styles.input}
                  value={selectedGate.name}
                />

                <Text style={styles.label}>Gate Description</Text>
                <TextInput
                  multiline
                  onChangeText={(value) => updateSelectedGate({ description: value })}
                  placeholder="Describe this gate"
                  placeholderTextColor="#8A95A7"
                  style={[styles.input, styles.textArea]}
                  value={selectedGate.description}
                />

                <Text style={styles.label}>Approach</Text>
                <TextInput
                  multiline
                  onChangeText={(value) => updateSelectedGate({ approach: value })}
                  placeholder="How to approach this gate"
                  placeholderTextColor="#8A95A7"
                  style={[styles.input, styles.textArea]}
                  value={selectedGate.approach}
                />

                <View style={styles.inspectorTabRow}>
                  <Pressable
                    onPress={() => setGateTab('prerequisites')}
                    style={[styles.inspectorTabButton, gateTab === 'prerequisites' && styles.inspectorTabButtonActive]}>
                    <Text style={[styles.inspectorTabText, gateTab === 'prerequisites' && styles.inspectorTabTextActive]}>
                      Prerequisites ({selectedGate.prerequisites.length})
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setGateTab('outcomes')}
                    style={[styles.inspectorTabButton, gateTab === 'outcomes' && styles.inspectorTabButtonActive]}>
                    <Text style={[styles.inspectorTabText, gateTab === 'outcomes' && styles.inspectorTabTextActive]}>
                      Outcomes ({selectedGate.outcomes.length})
                    </Text>
                  </Pressable>
                </View>

                {gateTab === 'prerequisites' ? (
                  <>
                    <View style={styles.rowButtons}>
                      <Pressable onPress={addPrerequisiteToSelectedGate} style={styles.buttonSubtle}>
                        <Text style={styles.buttonSubtleLabel}>Add Prerequisite</Text>
                      </Pressable>
                    </View>

                    {selectedGate.prerequisites.map((prerequisite, index) => {
                      const isExpanded = expandedPrerequisites[index];
                      const prereqTarget = prerequisite.type === 'area' ? areaOptionById.get(prerequisite.id ?? '') : skillOptionById.get(prerequisite.id ?? '');
                      
                      return (
                        <View key={`${selectedGate.id}_prereq_${index}`} style={styles.listCard}>
                          <Pressable
                            onPress={() => setExpandedPrerequisites((prev) => ({ ...prev, [index]: !isExpanded }))}
                            style={styles.listCardToggle}>
                            <Text style={styles.listCardToggleText}>
                              {prerequisite.type === 'area' ? 'Area' : 'Skill'}: {prereqTarget?.label || '(Not Selected)'}
                            </Text>
                            <Text style={styles.listCardToggleChevron}>{isExpanded ? '▴' : '▾'}</Text>
                          </Pressable>

                          {isExpanded ? (
                            <View style={styles.listCardContent}>
                              <View style={styles.rowButtons}>
                                <Pressable
                                  onPress={() => patchPrerequisite(index, { type: prerequisite.type === 'area' ? 'skill' : 'area' })}
                                  style={styles.buttonSubtle}>
                                  <Text style={styles.buttonSubtleLabel}>Type: {prerequisite.type}</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() =>
                                    patchPrerequisite(index, {
                                      recommendation_level: (((prerequisite.recommendation_level + 1) % 6) as 0 | 1 | 2 | 3 | 4 | 5),
                                    })
                                  }
                                  style={styles.buttonSubtle}>
                                  <Text style={styles.buttonSubtleLabel}>Rec: {prerequisite.recommendation_level}</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() =>
                                    patchPrerequisite(index, {
                                      level:
                                        prerequisite.level === 'fundamental'
                                          ? 'intermediate'
                                          : prerequisite.level === 'intermediate'
                                            ? 'advanced'
                                            : 'fundamental',
                                    })
                                  }
                                  style={styles.buttonSubtle}>
                                  <Text style={styles.buttonSubtleLabel}>Level: {prerequisite.level}</Text>
                                </Pressable>
                              </View>
                              <Text style={styles.label}>Prerequisite</Text>
                              <SearchComboBox
                                allowClear={false}
                                emptyLabel={
                                  prerequisite.type === 'area' ? 'No area found' : 'No skill found. Add skills in Backpack.'
                                }
                                onChange={(value) => {
                                  if (value) {
                                    patchPrerequisite(index, { id: value });
                                  }
                                }}
                                options={prerequisite.type === 'area' ? areaOptions : skillOptions}
                                placeholder={prerequisite.type === 'area' ? 'Select area prerequisite' : 'Select skill prerequisite'}
                                value={prerequisite.id || null}
                              />
                              {prerequisite.type === 'area' ? (
                                <View style={styles.rowButtons}>
                                  <Pressable
                                    onPress={() => {
                                      if (!prerequisite.id) {
                                        notify('Area not selected', 'Select an area prerequisite first.');
                                        return;
                                      }
                                      focusAreaInMap(prerequisite.id);
                                    }}
                                    style={styles.buttonSubtle}>
                                    <Text style={styles.buttonSubtleLabel}>Open Prerequisite Area</Text>
                                  </Pressable>
                                </View>
                              ) : prerequisite.id ? (
                                <View style={styles.rowButtons}>
                                  <Pressable
                                    onPress={() => {
                                      if (!skillOptionById.has(prerequisite.id)) {
                                        notify('Skill no longer exists', `The skill '${prerequisite.id}' cannot be found anymore.`);
                                        return;
                                      }
                                      onOpenLinkedSkill?.(prerequisite.id);
                                    }}
                                    style={styles.buttonSubtle}>
                                    <Text style={styles.buttonSubtleLabel}>Open Prerequisite Skill</Text>
                                  </Pressable>
                                </View>
                              ) : null}
                              {prerequisite.id ? (
                                prerequisite.type === 'area' ? (
                                  !areaOptionById.has(prerequisite.id) ? (
                                    <Text style={styles.unknownRefText}>{`<Unknown Area: ${prerequisite.id}>`}</Text>
                                  ) : null
                                ) : !skillOptionById.has(prerequisite.id) ? (
                                  <Text style={styles.unknownRefText}>{`<Unknown Skill: ${prerequisite.id}>`}</Text>
                                ) : null
                              ) : null}
                              <Text style={styles.label}>Prerequisite Description</Text>
                              <TextInput
                                multiline
                                onChangeText={(value) => patchPrerequisite(index, { description: value })}
                                placeholder="Why this prerequisite matters"
                                placeholderTextColor="#8A95A7"
                                style={[styles.input, styles.textArea]}
                                value={prerequisite.description}
                              />
                              <Pressable onPress={() => removePrerequisite(index)} style={styles.listDeleteButton}>
                                <Text style={styles.listDeleteText}>Remove Prerequisite</Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <View style={styles.rowButtons}>
                      <Pressable onPress={addOutcomeToSelectedGate} style={styles.buttonSubtle}>
                        <Text style={styles.buttonSubtleLabel}>Add Outcome</Text>
                      </Pressable>
                    </View>

                    {selectedGate.outcomes.map((outcome, index) => {
                      const isExpanded = expandedOutcomes[index];
                      const outcomeTarget = skillOptionById.get(outcome.id ?? '');
                      
                      return (
                        <View key={`${selectedGate.id}_outcome_${index}`} style={styles.listCard}>
                          <Pressable
                            onPress={() => setExpandedOutcomes((prev) => ({ ...prev, [index]: !isExpanded }))}
                            style={styles.listCardToggle}>
                            <Text style={styles.listCardToggleText}>
                              Skill: {outcomeTarget?.label || '(Not Selected)'}
                            </Text>
                            <Text style={styles.listCardToggleChevron}>{isExpanded ? '▴' : '▾'}</Text>
                          </Pressable>

                          {isExpanded ? (
                            <View style={styles.listCardContent}>
                              <Text style={styles.label}>Outcome Skill</Text>
                              <SearchComboBox
                                allowClear={false}
                                emptyLabel="No skills found. Add skills in Backpack."
                                onChange={(value) => {
                                  if (value) {
                                    patchOutcome(index, { id: value });
                                  }
                                }}
                                options={skillOptions}
                                placeholder="Select outcome skill"
                                value={outcome.id || null}
                              />
                              {outcome.id ? (
                                <View style={styles.rowButtons}>
                                  <Pressable
                                    onPress={() => {
                                      if (!skillOptionById.has(outcome.id)) {
                                        notify('Skill no longer exists', `The skill '${outcome.id}' cannot be found anymore.`);
                                        return;
                                      }
                                      onOpenLinkedSkill?.(outcome.id);
                                    }}
                                    style={styles.buttonSubtle}>
                                    <Text style={styles.buttonSubtleLabel}>Open Outcome Skill</Text>
                                  </Pressable>
                                </View>
                              ) : null}
                              {outcome.id && !skillOptionById.has(outcome.id) ? (
                                <Text style={styles.unknownRefText}>{`<Unknown Skill: ${outcome.id}>`}</Text>
                              ) : null}
                              <Pressable
                                onPress={() =>
                                  patchOutcome(index, {
                                    level:
                                      outcome.level === 'fundamental'
                                        ? 'intermediate'
                                        : outcome.level === 'intermediate'
                                          ? 'advanced'
                                          : 'fundamental',
                                  })
                                }
                                style={styles.buttonSubtle}>
                                <Text style={styles.buttonSubtleLabel}>Level: {outcome.level}</Text>
                              </Pressable>
                              <Text style={styles.label}>Outcome Description</Text>
                              <TextInput
                                multiline
                                onChangeText={(value) => patchOutcome(index, { description: value })}
                                placeholder="What is gained"
                                placeholderTextColor="#8A95A7"
                                style={[styles.input, styles.textArea]}
                                value={outcome.description}
                              />
                              <Pressable onPress={() => removeOutcome(index)} style={styles.listDeleteButton}>
                                <Text style={styles.listDeleteText}>Remove Outcome</Text>
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </>
                )}

                <Text style={styles.label}>Gate Mark</Text>
                <View style={styles.markGrid}>
                  {(Object.keys(GATE_MARK_COLORS) as (keyof typeof GATE_MARK_COLORS)[]).map((mark) => {
                    const active = getGateMark(state.marking.gate, selectedArea.id, selectedGate.id) === mark;
                    return (
                      <Pressable
                        key={mark}
                        onPress={() => setSelectedGateMark(mark)}
                        style={[styles.markChip, active && styles.markChipActive]}>
                        <View style={[styles.markDot, { backgroundColor: GATE_MARK_COLORS[mark] }]} />
                        <Text style={styles.markText}>{mark}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                {getGateMark(state.marking.gate, selectedArea.id, selectedGate.id) !== 'not_attempted' ? (
                  <>
                    <Text style={styles.label}>Gate Mark Description</Text>
                    <TextInput
                      multiline
                      onChangeText={updateSelectedGateMarkDescription}
                      placeholder="Why this gate is marked like this"
                      placeholderTextColor="#8A95A7"
                      style={[styles.input, styles.textArea]}
                      value={
                        state.marking.gate.find(
                          (item) => item.area_id === selectedArea.id && item.id === selectedGate.id
                        )?.descriptions ?? ''
                      }
                    />
                  </>
                ) : null}

                <Text style={styles.label}>Gate Note</Text>
                {selectedGateNote === undefined ? (
                  <Pressable onPress={createSelectedGateNote} style={styles.buttonSubtle}>
                    <Text style={styles.buttonSubtleLabel}>Open / Create Gate Note</Text>
                  </Pressable>
                ) : (
                  <TextInput
                    multiline
                    onChangeText={updateSelectedGateNote}
                    placeholder="Write a gate-specific note"
                    placeholderTextColor="#8A95A7"
                    style={[styles.input, styles.textArea]}
                    value={selectedGateNote}
                  />
                )}

                <Pressable
                  onPress={() =>
                    confirmDelete('Delete this gate and its mark state?', deleteSelectedGate)
                  }
                  style={styles.buttonDanger}>
                  <Text style={styles.buttonDangerLabel}>Delete Selected Gate</Text>
                </Pressable>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}

            <Pressable
              onPress={() =>
                confirmDelete('Delete this area? Linked references are preserved and shown as unknown placeholders.', removeSelectedArea)
              }
              style={styles.buttonDanger}>
              <Text style={styles.buttonDangerLabel}>Delete Area</Text>
            </Pressable>

            {roadsPanel}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#070C14',
  },
  main: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  breadcrumbs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingRight: 20,
  },
  breadcrumbItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  crumbButton: {
    backgroundColor: '#101A27',
    borderColor: '#29405A',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 170,
  },
  crumbText: {
    color: '#DFEBFA',
    fontSize: 12,
    fontWeight: '700',
  },
  crumbSeparator: {
    color: '#87A2BE',
    fontSize: 12,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderColor: '#2A3D56',
    borderWidth: 1,
    backgroundColor: '#0E1724',
    color: '#E4ECF8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  buttonPrimary: {
    backgroundColor: '#135084',
    borderColor: '#3C8DCF',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  buttonPrimaryLabel: {
    color: '#EAF6FF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  buttonSubtle: {
    backgroundColor: '#152131',
    borderColor: '#324A66',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  buttonSubtleLabel: {
    color: '#D4E4F8',
    fontSize: 12,
    fontWeight: '600',
  },
  canvasWrap: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A3C53',
    backgroundColor: '#0A111C',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 8,
  },
  canvasFrame: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    position: 'relative',
  },
  canvasEmptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  canvasEmptyTitle: {
    color: '#EAF5FF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  canvasEmptyText: {
    color: '#9FB7D0',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 20,
  },
  canvasHint: {
    color: '#95B2D0',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '600',
  },
  nodeWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  nodeCircle: {
    backgroundColor: '#0F1A29',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5CC0FF',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  nodeCircleArea: {
    backgroundColor: '#0F1A29',
  },
  nodeCircleIsolated: {
    backgroundColor: '#122337',
    borderStyle: 'dashed',
  },
  nodeCircleStructure: {
    backgroundColor: '#1A3652',
  },
  nodeTypeIcon: {
    color: '#D7E9FB',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  nodeTypeIconStructure: {
    color: '#F0F8FF',
    fontSize: 12,
  },
  nodeLabel: {
    color: '#EDF5FF',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 130,
    textAlign: 'center',
  },
  inspector: {
    width: 380,
    borderLeftWidth: 1,
    borderLeftColor: '#2A3A4E',
    backgroundColor: '#0A121E',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
  },
  panelTitle: {
    color: '#F0F7FF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyHint: {
    color: '#96A3B8',
    fontSize: 13,
    lineHeight: 20,
  },
  panelContent: {
    gap: 10,
    paddingBottom: 34,
  },
  sectionToggle: {
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
  sectionToggleSecondary: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#35506F',
    backgroundColor: '#0F1C2D',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionToggleText: {
    color: '#D5EAFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionToggleChevron: {
    color: '#A8C3DF',
    fontSize: 12,
    fontWeight: '700',
  },
  roadsPanel: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#2B3E57',
    paddingTop: 12,
    gap: 8,
  },
  roadEditorWrap: {
    gap: 8,
  },
  label: {
    color: '#ABBBCE',
    fontSize: 12,
    fontWeight: '600',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  markGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  markChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#122031',
    borderWidth: 1,
    borderColor: '#314966',
  },
  markChipActive: {
    borderColor: '#75C7FF',
    backgroundColor: '#17314B',
  },
  markDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markText: {
    color: '#DBE7F8',
    fontSize: 11,
    fontWeight: '600',
  },
  unknownRefText: {
    color: '#F2B8C0',
    fontSize: 11,
    fontWeight: '600',
  },
  listCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#324A67',
    backgroundColor: '#111C2A',
    padding: 8,
    gap: 6,
  },
  listCardToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#162436',
    borderRadius: 8,
  },
  listCardToggleText: {
    color: '#D5EAFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listCardToggleChevron: {
    color: '#A8C3DF',
    fontSize: 12,
    fontWeight: '700',
  },
  listCardContent: {
    gap: 8,
    marginTop: 8,
  },
  inspectorTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  inspectorTabButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#29405A',
    backgroundColor: '#0F1A27',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspectorTabButtonActive: {
    borderColor: '#73C5FF',
    backgroundColor: '#132A42',
  },
  inspectorTabText: {
    color: '#B9C8DB',
    fontSize: 12,
    fontWeight: '700',
  },
  inspectorTabTextActive: {
    color: '#EAF6FF',
  },
  listDeleteButton: {
    borderRadius: 8,
    backgroundColor: '#2F1419',
    borderWidth: 1,
    borderColor: '#5B2530',
    paddingVertical: 6,
  },
  listDeleteText: {
    color: '#FFD9DF',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  gateChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gateChip: {
    backgroundColor: '#152232',
    borderWidth: 1,
    borderColor: '#35506F',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gateChipActive: {
    borderColor: '#78C8FF',
    backgroundColor: '#173754',
  },
  gateChipText: {
    color: '#D2E1F6',
    fontSize: 11,
    fontWeight: '600',
  },
  buttonDanger: {
    backgroundColor: '#36161A',
    borderColor: '#6F2E35',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  buttonDangerLabel: {
    color: '#FFDDE1',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 12,
  },
});