import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  keyboardShortcuts,
  formatShortcut,
  getShortcutsByCategory,
  searchShortcuts,
  type ShortcutCategory,
} from '@/lib/keyboardShortcuts';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { Search } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const categoryLabels: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  'table-viewer': 'Table Viewer',
  'query-builder': 'Query Builder',
  editor: 'Editor',
  general: 'General',
};

export function KeyboardShortcutsDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: KeyboardShortcutsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use controlled or internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Open with Ctrl+/ (but only if not in an editor/textarea)
  useKeyboardShortcut(
    '/',
    () => {
      // Check if focus is on a textarea or input (editor context)
      const activeElement = document.activeElement;
      const isInEditor = activeElement && (
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'INPUT' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      // Only open shortcuts dialog if not in editor
      if (!isInEditor) {
        setOpen(true);
      }
    },
    { ctrl: true }
  );

  // Also open with ?
  useKeyboardShortcut(
    '?',
    () => setOpen(true),
    {}
  );

  // Close with Escape
  useKeyboardShortcut(
    'Escape',
    () => setOpen(false),
    {},
    { target: open ? document : null, enabled: open }
  );

  // Filter shortcuts based on search
  const filteredShortcuts = searchQuery
    ? searchShortcuts(keyboardShortcuts, searchQuery)
    : keyboardShortcuts;

  const shortcutsByCategory = getShortcutsByCategory(filteredShortcuts);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            View and search all available keyboard shortcuts
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Shortcuts List */}
          <div className="flex-1 overflow-y-auto space-y-6">
            {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => {
              if (shortcuts.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    {categoryLabels[category as ShortcutCategory]}
                  </h3>
                  <div className="space-y-1">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {shortcut.description}
                          </div>
                          {shortcut.context && (
                            <div className="text-xs text-muted-foreground">
                              Available in {shortcut.context}
                            </div>
                          )}
                        </div>
                        <kbd className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted border border-border rounded-md">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredShortcuts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No shortcuts found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

