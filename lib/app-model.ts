export type AreaKind = 'area' | 'structure';

export type AreaMark =
  | 'unexplored'
  | 'target'
  | 'blocked'
  | 'entered'
  | 'exploring'
  | 'explored'
  | 'ignored'
  | 'bypassed';

export type GateMark =
  | 'not_attempted'
  | 'attempted'
  | 'blocked'
  | 'challenging'
  | 'success'
  | 'ignored'
  | 'bypassed';

export interface GatePrerequisite {
  id: string;
  type: 'area' | 'skill';
  recommendation_level: 0 | 1 | 2 | 3 | 4 | 5;
  description: string;
  level: 'fundamental' | 'intermediate' | 'advanced';
}

export interface GateOutcome {
  id: string;
  description: string;
  level: 'fundamental' | 'intermediate' | 'advanced';
}

export interface Gate {
  id: string;
  name: string;
  description: string;
  approach: string;
  prerequisites: GatePrerequisite[];
  outcomes: GateOutcome[];
}

export interface AreaNode {
  id: string;
  name: string;
  kind: AreaKind;
  isolated: boolean;
  description: string;
  gates: Gate[];
  subareas: AreaNode[];
}

export interface JournalMeta {
  id: string;
  area: string | null;
  name: string;
  description: string;
  tags: string[];
}

export interface BackpackItem {
  id: string;
  area: string | null;
  name: string;
  descriptions: string;
  content: string;
  tags: string[];
}

export interface AreaMarkState {
  id: string;
  mark: AreaMark;
  descriptions: string;
}

export interface GateMarkState {
  id: string;
  area_id: string;
  mark: GateMark;
  descriptions: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
}

export interface RoadAreaStep {
  id: string;
  gates: string[];
  description: string;
}

export interface Road {
  id: string;
  name: string;
  description: string;
  areas: RoadAreaStep[];
}

export interface AppState {
  world: AreaNode[];
  journals: JournalMeta[];
  journalContentById: Record<string, string>;
  backpack: Record<string, BackpackItem>;
  gateNotes: Record<string, string>;
  skills: Skill[];
  roads: Road[];
  marking: {
    area: AreaMarkState[];
    gate: GateMarkState[];
  };
}

export const MARK_COLORS: Record<AreaMark, string> = {
  unexplored: '#7D8597',
  target: '#3FA7FF',
  blocked: '#FF6B6B',
  entered: '#4CC9A6',
  exploring: '#68D8FF',
  explored: '#94A3B8',
  ignored: '#6C757D',
  bypassed: '#F4A261',
};

export const GATE_MARK_COLORS: Record<GateMark, string> = {
  not_attempted: '#7D8597',
  attempted: '#F59E0B',
  blocked: '#FF6B6B',
  challenging: '#3FA7FF',
  success: '#4CC9A6',
  ignored: '#6C757D',
  bypassed: '#F4A261',
};

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeGateNoteKey(areaId: string, gateId: string): string {
  return `${areaId}::${gateId}`;
}

export function makeSequentialUntitledName(existingNames: string[], baseLabel: string): string {
  const escapedBase = baseLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedBase}(?:\\s+(\\d+))?$`, 'i');

  let maxIndex = 0;
  for (const name of existingNames) {
    const match = name.trim().match(pattern);
    if (!match) {
      continue;
    }
    const parsed = Number(match[1] ?? 1);
    if (!Number.isNaN(parsed)) {
      maxIndex = Math.max(maxIndex, parsed);
    }
  }

  return `${baseLabel} ${maxIndex + 1}`;
}

export function createArea(name: string, kind: AreaKind = 'area'): AreaNode {
  return {
    id: makeId('area'),
    name,
    kind,
    isolated: false,
    description: '',
    gates: [],
    subareas: [],
  };
}

export function findAreaById(nodes: AreaNode[], areaId: string): AreaNode | null {
  for (const area of nodes) {
    if (area.id === areaId) {
      return area;
    }
    const nested = findAreaById(area.subareas, areaId);
    if (nested) {
      return nested;
    }
  }
  return null;
}

export function findParentAreaId(nodes: AreaNode[], targetAreaId: string, parentId: string | null = null): string | null {
  for (const area of nodes) {
    if (area.id === targetAreaId) {
      return parentId;
    }
    const nested = findParentAreaId(area.subareas, targetAreaId, area.id);
    if (nested !== null) {
      return nested;
    }
  }
  return null;
}

export function updateAreaById(
  nodes: AreaNode[],
  areaId: string,
  updater: (area: AreaNode) => AreaNode
): AreaNode[] {
  return nodes.map((area) => {
    if (area.id === areaId) {
      return updater(area);
    }
    return {
      ...area,
      subareas: updateAreaById(area.subareas, areaId, updater),
    };
  });
}

export function deleteAreaById(nodes: AreaNode[], areaId: string): AreaNode[] {
  return nodes
    .filter((area) => area.id !== areaId)
    .map((area) => ({
      ...area,
      subareas: deleteAreaById(area.subareas, areaId),
    }));
}

export function listAreaIds(nodes: AreaNode[]): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    result.push(node.id);
    result.push(...listAreaIds(node.subareas));
  }
  return result;
}

export function flattenAreasWithPath(
  nodes: AreaNode[],
  parentPath: string[] = []
): Array<{ id: string; name: string; pathLabel: string }> {
  const result: Array<{ id: string; name: string; pathLabel: string }> = [];
  for (const node of nodes) {
    const path = [...parentPath, node.name];
    result.push({
      id: node.id,
      name: node.name,
      pathLabel: path.join(' / '),
    });
    result.push(...flattenAreasWithPath(node.subareas, path));
  }
  return result;
}

export function addGateDependency(nodes: AreaNode[], targetAreaId: string, sourceAreaId: string): AreaNode[] {
  return updateAreaById(nodes, targetAreaId, (area) => {
    const nextGate: Gate = {
      id: makeId('gate'),
      name: `Gate from ${sourceAreaId}`,
      description: '',
      approach: '',
      prerequisites: [
        {
          id: sourceAreaId,
          type: 'area',
          recommendation_level: 4,
          description: 'Linked from map editor',
          level: 'fundamental',
        },
      ],
      outcomes: [],
    };

    return {
      ...area,
      gates: [...area.gates, nextGate],
    };
  });
}

export function getAreaMark(marking: AreaMarkState[], areaId: string): AreaMark {
  return marking.find((value) => value.id === areaId)?.mark ?? 'unexplored';
}

export function getGateMark(marking: GateMarkState[], areaId: string, gateId: string): GateMark {
  return marking.find((value) => value.area_id === areaId && value.id === gateId)?.mark ?? 'not_attempted';
}

export const initialState: AppState = {
  world: [],
  journals: [],
  journalContentById: {},
  backpack: {},
  gateNotes: {},
  skills: [],
  roads: [],
  marking: {
    area: [],
    gate: [],
  },
};