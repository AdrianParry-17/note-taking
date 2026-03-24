import { z } from 'zod';

import { AppState, makeGateNoteKey } from '@/lib/app-model';

type DirectoryHandle = any;

const gateMarkValues = [
  'not_attempted',
  'attempted',
  'blocked',
  'challenging',
  'success',
  'ignored',
  'bypassed',
] as const;

const areaMarkValues = [
  'unexplored',
  'target',
  'blocked',
  'entered',
  'exploring',
  'explored',
  'ignored',
  'bypassed',
] as const;

const worldSchema: z.ZodType<AppState['world']> = z.lazy(() =>
  z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      kind: z.enum(['area', 'structure']),
      isolated: z.boolean(),
      description: z.string(),
      gates: z.array(
        z.object({
          id: z.string().min(1),
          name: z.string(),
          description: z.string(),
          approach: z.string(),
          prerequisites: z.array(
            z.object({
              id: z.string().min(1),
              type: z.enum(['area', 'skill']),
              recommendation_level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
              description: z.string(),
              level: z.enum(['fundamental', 'intermediate', 'advanced']),
            })
          ),
          outcomes: z.array(
            z.object({
              id: z.string().min(1),
              description: z.string(),
              level: z.enum(['fundamental', 'intermediate', 'advanced']),
            })
          ),
        })
      ),
      subareas: worldSchema,
    })
  )
);

const worldJsonSchema = z.object({
  world: worldSchema,
  journals: z.array(
    z.object({
      id: z.string().min(1),
      area: z.string().nullable(),
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
    })
  ),
  skills: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      description: z.string(),
    })
  ),
  roads: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      description: z.string(),
      areas: z.array(
        z.object({
          id: z.string().min(1),
          gates: z.array(z.string()),
          description: z.string(),
        })
      ),
    })
  ),
  marking: z.object({
    area: z.array(
      z.object({
        id: z.string().min(1),
        mark: z.enum(areaMarkValues),
        descriptions: z.string(),
      })
    ),
    gate: z.array(
      z.object({
        id: z.string().min(1),
        area_id: z.string().min(1),
        mark: z.enum(gateMarkValues),
        descriptions: z.string(),
      })
    ),
  }),
});

const backpackItemSchema = z.object({
  id: z.string().optional(),
  area: z.string().nullable().default(null),
  name: z.string().default('Untitled Item'),
  descriptions: z.string().default(''),
  content: z.string().default(''),
  tags: z.array(z.string()).default([]),
});

const backpackSchema = z.record(z.string(), backpackItemSchema);

export interface LoadedWorld {
  state: AppState;
  diagnostics: string[];
}

export interface SaveWorldResult {
  warnings: string[];
}

export function isWorldStorageSupported(): boolean {
  return typeof (globalThis as any).showDirectoryPicker === 'function';
}

export async function pickWorldDirectory(): Promise<DirectoryHandle | null> {
  if (!isWorldStorageSupported()) {
    return null;
  }

  try {
    return await (globalThis as any).showDirectoryPicker();
  } catch {
    return null;
  }
}

export async function directoryHasWorldJson(directory: DirectoryHandle): Promise<boolean> {
  const file = await readTextFile(directory, 'world.json');
  if (file === null) {
    return false;
  }

  try {
    const parsed = JSON.parse(file);
    return worldJsonSchema.safeParse(parsed).success;
  } catch {
    return false;
  }
}

export async function directoryHasFile(directory: DirectoryHandle, relativePath: string): Promise<boolean> {
  return (await readTextFile(directory, relativePath)) !== null;
}

export async function initializeWorldDirectory(directory: DirectoryHandle, templateState: AppState): Promise<void> {
  await writeWorldJson(directory, templateState);
  const dataDirectory = await ensureDirectory(directory, 'data');
  await ensureDirectory(dataDirectory, 'journals');
  await ensureDirectory(dataDirectory, 'marking');
  await writeBackpack(directory, templateState.backpack);

  for (const journal of templateState.journals) {
    const content = templateState.journalContentById[journal.id] ?? '';
    await writeTextFile(directory, `data/journals/${journal.id}.md`, content);
  }

  for (const [key, content] of Object.entries(templateState.gateNotes)) {
    const [areaId, gateId] = key.split('::');
    if (!areaId || !gateId) {
      continue;
    }
    await writeTextFile(directory, `data/marking/${areaId}/${gateId}_note.md`, content);
  }
}

export async function loadWorldFromDirectory(directory: DirectoryHandle): Promise<LoadedWorld> {
  const diagnostics: string[] = [];
  const worldFile = await readTextFile(directory, 'world.json');
  if (worldFile === null) {
    throw new Error('world.json not found in selected folder.');
  }

  let worldParsedRaw: unknown;
  try {
    worldParsedRaw = JSON.parse(worldFile);
  } catch {
    throw new Error('world.json is not valid JSON.');
  }

  const parsedResult = worldJsonSchema.safeParse(worldParsedRaw);
  if (!parsedResult.success) {
    throw new Error('world.json failed schema validation.');
  }

  const parsedWorld = parsedResult.data;
  const journalContentById: Record<string, string> = {};
  for (const journal of parsedWorld.journals) {
    const content = await readTextFile(directory, `data/journals/${journal.id}.md`);
    if (content === null) {
      diagnostics.push(`Missing journal content for ${journal.id}; created blank content.`);
      journalContentById[journal.id] = '';
      continue;
    }
    journalContentById[journal.id] = content;
  }

  const backpackRaw = await readTextFile(directory, 'data/backpack.json');
  const backpack: AppState['backpack'] = {};
  if (backpackRaw !== null) {
    try {
      const parsedBackpackResult = backpackSchema.safeParse(JSON.parse(backpackRaw));
      if (!parsedBackpackResult.success) {
        diagnostics.push('backpack.json invalid schema; loaded as empty backpack.');
      } else {
        for (const [id, item] of Object.entries(parsedBackpackResult.data)) {
          backpack[id] = {
            id: item.id ?? id,
            area: item.area,
            name: item.name,
            descriptions: item.descriptions,
            content: item.content,
            tags: item.tags,
          };
        }
      }
    } catch {
      diagnostics.push('backpack.json invalid JSON; loaded as empty backpack.');
    }
  } else {
    diagnostics.push('backpack.json missing; loaded as empty backpack.');
  }

  const gateNotes = await loadGateNotes(directory);

  return {
    state: {
      world: parsedWorld.world,
      journals: parsedWorld.journals,
      journalContentById,
      backpack,
      gateNotes,
      skills: parsedWorld.skills,
      roads: parsedWorld.roads,
      marking: parsedWorld.marking,
    },
    diagnostics,
  };
}

export async function saveWorldToDirectory(directory: DirectoryHandle, state: AppState): Promise<SaveWorldResult> {
  const warnings: string[] = [];

  await writeWorldJson(directory, state);
  const dataDirectory = await ensureDirectory(directory, 'data');
  await ensureDirectory(dataDirectory, 'journals');
  await ensureDirectory(dataDirectory, 'marking');
  await writeBackpack(directory, state.backpack);

  for (const journal of state.journals) {
    const content = state.journalContentById[journal.id] ?? '';
    await writeTextFile(directory, `data/journals/${journal.id}.md`, content);
  }

  for (const [key, content] of Object.entries(state.gateNotes)) {
    const [areaId, gateId] = key.split('::');
    if (!areaId || !gateId) {
      warnings.push(`Skipped malformed gate note key: ${key}`);
      continue;
    }
    await writeTextFile(directory, `data/marking/${areaId}/${gateId}_note.md`, content);
  }

  return { warnings };
}

async function loadGateNotes(directory: DirectoryHandle): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const markingHandle = await getDirectory(directory, 'data/marking', false);
  if (!markingHandle) {
    return result;
  }

  for await (const [areaId, areaEntry] of markingHandle.entries()) {
    if (areaEntry.kind !== 'directory') {
      continue;
    }

    for await (const [fileName, fileEntry] of areaEntry.entries()) {
      if (fileEntry.kind !== 'file') {
        continue;
      }
      if (!fileName.endsWith('_note.md')) {
        continue;
      }

      const gateId = fileName.slice(0, -'_note.md'.length);
      const file = await fileEntry.getFile();
      const content = await file.text();
      const key = makeGateNoteKey(areaId, gateId);
      result[key] = content;
    }
  }

  return result;
}

async function writeWorldJson(directory: DirectoryHandle, state: AppState): Promise<void> {
  const worldPayload = {
    world: state.world,
    journals: state.journals,
    skills: state.skills,
    roads: state.roads,
    marking: state.marking,
  };
  await writeTextFile(directory, 'world.json', JSON.stringify(worldPayload, null, 2));
}

async function writeBackpack(directory: DirectoryHandle, backpack: AppState['backpack']): Promise<void> {
  const backpackPayload: Record<string, Omit<AppState['backpack'][string], 'id'> & { id?: string }> = {};
  for (const [id, item] of Object.entries(backpack)) {
    backpackPayload[id] = {
      id: item.id === id ? undefined : item.id,
      area: item.area,
      name: item.name,
      descriptions: item.descriptions,
      content: item.content,
      tags: item.tags,
    };
  }
  await writeTextFile(directory, 'data/backpack.json', JSON.stringify(backpackPayload, null, 2));
}

async function readTextFile(directory: DirectoryHandle, relativePath: string): Promise<string | null> {
  const parts = relativePath.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) {
    return null;
  }

  let current: DirectoryHandle = directory;
  for (const part of parts) {
    const next = await getDirectory(current, part, false);
    if (!next) {
      return null;
    }
    current = next;
  }

  try {
    const fileHandle = await current.getFileHandle(fileName);
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

async function writeTextFile(directory: DirectoryHandle, relativePath: string, content: string): Promise<void> {
  const parts = relativePath.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) {
    return;
  }

  let current: DirectoryHandle = directory;
  for (const part of parts) {
    current = await ensureDirectory(current, part);
  }

  const fileHandle = await current.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function ensureDirectory(directory: DirectoryHandle, childName: string): Promise<DirectoryHandle> {
  return await directory.getDirectoryHandle(childName, { create: true });
}

async function getDirectory(
  directory: DirectoryHandle,
  childName: string,
  create: boolean
): Promise<DirectoryHandle | null> {
  try {
    return await directory.getDirectoryHandle(childName, { create });
  } catch {
    return null;
  }
}