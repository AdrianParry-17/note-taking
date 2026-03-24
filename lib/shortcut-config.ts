import { AppSection } from '@/components/app/left-sidebar';

export type ShortcutAction =
  | 'focusSearch'
  | 'openCommandPalette'
  | 'saveWorld'
  | 'goMap'
  | 'goJournal'
  | 'goBackpack'
  | 'goUtility'
  | 'newJournal'
  | 'newBackpackItem'
  | 'newSkill'
  | 'dismissOverlay';

export interface ShortcutConfigItem {
  action: ShortcutAction;
  label: string;
  keys: string;
  description: string;
  group: 'Navigation' | 'Search' | 'Creation' | 'Overlay';
}

export const SHORTCUTS: ShortcutConfigItem[] = [
  {
    action: 'focusSearch',
    label: 'Focus Global Search',
    keys: 'Ctrl+K / Cmd+K',
    description: 'Move keyboard focus to universal search in the header.',
    group: 'Search',
  },
  {
    action: 'openCommandPalette',
    label: 'Open Command Palette',
    keys: 'Ctrl+P / Cmd+P',
    description: 'Open action launcher for navigation and quick-create commands.',
    group: 'Search',
  },
  {
    action: 'saveWorld',
    label: 'Save Active World',
    keys: 'Ctrl+S / Cmd+S',
    description: 'Save current world.json, journals, backpack, and gate notes to disk.',
    group: 'Overlay',
  },
  {
    action: 'goMap',
    label: 'Go to Map',
    keys: 'Alt+1',
    description: 'Switch workspace to Journey Map.',
    group: 'Navigation',
  },
  {
    action: 'goJournal',
    label: 'Go to Journal',
    keys: 'Alt+2',
    description: 'Switch workspace to Journal editor.',
    group: 'Navigation',
  },
  {
    action: 'goBackpack',
    label: 'Go to Backpack',
    keys: 'Alt+3',
    description: 'Switch workspace to Backpack inventory.',
    group: 'Navigation',
  },
  {
    action: 'goUtility',
    label: 'Go to Utility',
    keys: 'Alt+4',
    description: 'Switch workspace to Utility and options.',
    group: 'Navigation',
  },
  {
    action: 'newJournal',
    label: 'Quick New Journal',
    keys: 'Ctrl+Shift+J / Cmd+Shift+J',
    description: 'Create a general journal and open it immediately.',
    group: 'Creation',
  },
  {
    action: 'newBackpackItem',
    label: 'Quick New Backpack Item',
    keys: 'Ctrl+Shift+B / Cmd+Shift+B',
    description: 'Create a general backpack item and open it immediately.',
    group: 'Creation',
  },
  {
    action: 'newSkill',
    label: 'Quick New Skill',
    keys: 'Ctrl+Shift+S / Cmd+Shift+S',
    description: 'Create a skill and open it in Utility.',
    group: 'Creation',
  },
  {
    action: 'dismissOverlay',
    label: 'Dismiss Search / Palette',
    keys: 'Esc',
    description: 'Close currently opened global overlay and blur focused field.',
    group: 'Overlay',
  },
];

export const SECTION_SHORTCUT_BADGE: Record<AppSection, string> = {
  map: 'Alt+1',
  journal: 'Alt+2',
  backpack: 'Alt+3',
  utility: 'Alt+4',
};
