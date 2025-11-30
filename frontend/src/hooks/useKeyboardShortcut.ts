import { useEffect, useCallback, useRef } from 'react';

export type KeyboardModifiers = {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export type KeyboardShortcutOptions = {
  /** Whether the shortcut is enabled (default: true) */
  enabled?: boolean;
  /** Whether to prevent default behavior (default: true) */
  preventDefault?: boolean;
  /** Whether to stop propagation (default: true) */
  stopPropagation?: boolean;
  /** Target element to attach listener to (default: document) */
  target?: HTMLElement | Document | null;
};

/**
 * Hook to handle keyboard shortcuts
 * 
 * @param key - The key to listen for (e.g., 'k', 'Enter', 'Escape')
 * @param callback - Function to call when shortcut is triggered
 * @param modifiers - Modifier keys (ctrl, shift, alt, meta)
 * @param options - Additional options
 * 
 * @example
 * useKeyboardShortcut('k', () => openPalette(), { ctrl: true });
 */
export function useKeyboardShortcut(
  key: string,
  callback: (event: KeyboardEvent) => void,
  modifiers: KeyboardModifiers = {},
  options: KeyboardShortcutOptions = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = true,
    target = typeof document !== 'undefined' ? document : null,
  } = options;

  const callbackRef = useRef(callback);
  const modifiersRef = useRef(modifiers);

  // Update refs when values change
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    modifiersRef.current = modifiers;
  }, [modifiers]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !target) return;

      const { ctrl, shift, alt, meta } = modifiersRef.current;

      // Check modifiers
      if (ctrl !== undefined && event.ctrlKey !== ctrl) return;
      if (shift !== undefined && event.shiftKey !== shift) return;
      if (alt !== undefined && event.altKey !== alt) return;
      if (meta !== undefined && event.metaKey !== meta) return;

      // Check key (case-insensitive for letters)
      const eventKey = event.key.toLowerCase();
      const targetKey = key.toLowerCase();

      if (eventKey !== targetKey) return;

      // Prevent default and stop propagation if needed
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      // Call callback
      callbackRef.current(event);
    },
    [enabled, preventDefault, stopPropagation, key, target]
  );

  useEffect(() => {
    if (!target || !enabled) return;

    target.addEventListener('keydown', handleKeyDown);

    return () => {
      target.removeEventListener('keydown', handleKeyDown);
    };
  }, [target, handleKeyDown, enabled]);
}

/**
 * Hook to handle multiple keyboard shortcuts
 * 
 * @param shortcuts - Array of shortcut definitions
 * @param options - Global options for all shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{
    key: string;
    callback: (event: KeyboardEvent) => void;
    modifiers?: KeyboardModifiers;
    enabled?: boolean;
  }>,
  options: Omit<KeyboardShortcutOptions, 'enabled'> = {}
) {
  shortcuts.forEach(({ key, callback, modifiers, enabled = true }) => {
    useKeyboardShortcut(key, callback, modifiers, { ...options, enabled });
  });
}










