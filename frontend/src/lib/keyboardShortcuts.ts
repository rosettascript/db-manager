/**
 * Keyboard Shortcuts Registry
 * 
 * Defines all keyboard shortcuts in the application with descriptions and categories.
 */

export type ShortcutCategory = 
  | 'navigation' 
  | 'table-viewer' 
  | 'query-builder' 
  | 'editor' 
  | 'general';

export interface KeyboardShortcut {
  /** Unique identifier for the shortcut */
  id: string;
  /** Keyboard key(s) */
  key: string;
  /** Modifier keys */
  modifiers: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  /** Human-readable description */
  description: string;
  /** Category for grouping */
  category: ShortcutCategory;
  /** Context where shortcut is available (undefined = global) */
  context?: string;
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.modifiers.ctrl) parts.push('Ctrl');
  if (shortcut.modifiers.shift) parts.push('Shift');
  if (shortcut.modifiers.alt) parts.push('Alt');
  if (shortcut.modifiers.meta) parts.push('Cmd');

  // Format the key
  let keyDisplay = shortcut.key;
  if (keyDisplay.length === 1) {
    keyDisplay = keyDisplay.toUpperCase();
  } else {
    // Special keys
    keyDisplay = keyDisplay
      .replace('Enter', 'Enter')
      .replace('Escape', 'Esc')
      .replace('Delete', 'Del')
      .replace('ArrowUp', '↑')
      .replace('ArrowDown', '↓')
      .replace('ArrowLeft', '←')
      .replace('ArrowRight', '→');
  }

  parts.push(keyDisplay);
  return parts.join(' + ');
}

/**
 * Get all shortcuts by category
 */
export function getShortcutsByCategory(
  shortcuts: KeyboardShortcut[]
): Record<ShortcutCategory, KeyboardShortcut[]> {
  const grouped: Record<ShortcutCategory, KeyboardShortcut[]> = {
    navigation: [],
    'table-viewer': [],
    'query-builder': [],
    editor: [],
    general: [],
  };

  shortcuts.forEach((shortcut) => {
    if (grouped[shortcut.category]) {
      grouped[shortcut.category].push(shortcut);
    }
  });

  return grouped;
}

/**
 * Search shortcuts by description or key
 */
export function searchShortcuts(
  shortcuts: KeyboardShortcut[],
  query: string
): KeyboardShortcut[] {
  const lowerQuery = query.toLowerCase();
  return shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(lowerQuery) ||
      shortcut.key.toLowerCase().includes(lowerQuery) ||
      formatShortcut(shortcut).toLowerCase().includes(lowerQuery)
  );
}

/**
 * Detect conflicts in keyboard shortcuts
 * Returns an array of conflict groups where shortcuts share the same key combination
 */
export function detectShortcutConflicts(
  shortcuts: KeyboardShortcut[]
): Array<{ keyCombo: string; shortcuts: KeyboardShortcut[] }> {
  const conflictMap = new Map<string, KeyboardShortcut[]>();

  shortcuts.forEach((shortcut) => {
    // Create a unique key for the combination
    const keyCombo = [
      shortcut.modifiers.ctrl ? 'ctrl' : '',
      shortcut.modifiers.shift ? 'shift' : '',
      shortcut.modifiers.alt ? 'alt' : '',
      shortcut.modifiers.meta ? 'meta' : '',
      shortcut.key.toLowerCase(),
      shortcut.context || 'global',
    ]
      .filter(Boolean)
      .join('+');

    if (!conflictMap.has(keyCombo)) {
      conflictMap.set(keyCombo, []);
    }
    conflictMap.get(keyCombo)!.push(shortcut);
  });

  // Return only combinations with conflicts (more than one shortcut)
  const conflicts: Array<{ keyCombo: string; shortcuts: KeyboardShortcut[] }> = [];
  conflictMap.forEach((shortcuts, keyCombo) => {
    if (shortcuts.length > 1) {
      conflicts.push({ keyCombo, shortcuts });
    }
  });

  return conflicts;
}

/**
 * Check if a shortcut conflicts with existing shortcuts
 */
export function hasShortcutConflict(
  shortcut: KeyboardShortcut,
  shortcuts: KeyboardShortcut[]
): boolean {
  const conflicts = detectShortcutConflicts([...shortcuts, shortcut]);
  return conflicts.some(
    (conflict) =>
      conflict.shortcuts.some((s) => s.id === shortcut.id) &&
      conflict.shortcuts.length > 1
  );
}

/**
 * All keyboard shortcuts in the application
 */
export const keyboardShortcuts: KeyboardShortcut[] = [
  // Navigation Shortcuts
  {
    id: 'open-command-palette',
    key: 'k',
    modifiers: { ctrl: true },
    description: 'Open command palette',
    category: 'navigation',
  },
  {
    id: 'show-shortcuts',
    key: '/',
    modifiers: { ctrl: true },
    description: 'Show keyboard shortcuts',
    category: 'navigation',
  },
  {
    id: 'toggle-sidebar',
    key: 'b',
    modifiers: { ctrl: true },
    description: 'Toggle sidebar',
    category: 'navigation',
  },
  {
    id: 'open-settings',
    key: ',',
    modifiers: { ctrl: true },
    description: 'Open settings',
    category: 'navigation',
  },
  {
    id: 'quick-open',
    key: 'p',
    modifiers: { ctrl: true },
    description: 'Quick open/search',
    category: 'navigation',
  },

  // Table Viewer Shortcuts
  {
    id: 'focus-search',
    key: 'f',
    modifiers: { ctrl: true },
    description: 'Focus search box',
    category: 'table-viewer',
    context: 'table-viewer',
  },
  {
    id: 'refresh-data',
    key: 'r',
    modifiers: { ctrl: true },
    description: 'Refresh data',
    category: 'table-viewer',
    context: 'table-viewer',
  },
  {
    id: 'toggle-edit-mode',
    key: 'e',
    modifiers: { ctrl: true },
    description: 'Toggle edit mode',
    category: 'table-viewer',
    context: 'table-viewer',
  },
  {
    id: 'select-all-rows',
    key: 'a',
    modifiers: { ctrl: true },
    description: 'Select all rows (requires row selection feature)',
    category: 'table-viewer',
    context: 'table-viewer',
  },
  {
    id: 'delete-selected',
    key: 'Delete',
    modifiers: {},
    description: 'Delete selected rows (requires row selection feature)',
    category: 'table-viewer',
    context: 'table-viewer',
  },
  {
    id: 'close-dialog',
    key: 'Escape',
    modifiers: {},
    description: 'Close dialog/cancel selection',
    category: 'table-viewer',
    context: 'table-viewer',
  },

  // Query Builder Shortcuts
  {
    id: 'execute-query',
    key: 'Enter',
    modifiers: { ctrl: true },
    description: 'Execute query',
    category: 'query-builder',
    context: 'query-builder',
  },
  {
    id: 'execute-query-f5',
    key: 'F5',
    modifiers: {},
    description: 'Execute query',
    category: 'query-builder',
    context: 'query-builder',
  },
  {
    id: 'save-query',
    key: 's',
    modifiers: { ctrl: true },
    description: 'Save query',
    category: 'query-builder',
    context: 'query-builder',
  },
  {
    id: 'clear-query',
    key: 'l',
    modifiers: { ctrl: true },
    description: 'Clear query',
    category: 'query-builder',
    context: 'query-builder',
  },

  // Editor Shortcuts (handled by editor itself)
  {
    id: 'duplicate-line',
    key: 'd',
    modifiers: { ctrl: true },
    description: 'Duplicate line',
    category: 'editor',
    context: 'editor',
  },
  {
    id: 'move-line-up',
    key: 'ArrowUp',
    modifiers: { alt: true },
    description: 'Move line up',
    category: 'editor',
    context: 'editor',
  },
  {
    id: 'move-line-down',
    key: 'ArrowDown',
    modifiers: { alt: true },
    description: 'Move line down',
    category: 'editor',
    context: 'editor',
  },
  {
    id: 'delete-line',
    key: 'k',
    modifiers: { ctrl: true, shift: true },
    description: 'Delete line',
    category: 'editor',
    context: 'editor',
  },
  {
    id: 'comment-line',
    key: '/',
    modifiers: { ctrl: true },
    description: 'Comment/uncomment line (in editor) or show shortcuts (elsewhere)',
    category: 'editor',
    context: 'editor',
  },
];

