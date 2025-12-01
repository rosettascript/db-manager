import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';
import {
  FileSearch,
  Table2,
  Workflow,
  Code2,
  Database,
  Settings,
  Clock,
} from 'lucide-react';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

const RECENT_COMMANDS_KEY = 'db-visualizer-recent-commands';
const MAX_RECENT_COMMANDS = 5;

// Context for CommandPalette state
const CommandPaletteContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPalette');
  }
  return context;
}

export interface CommandPaletteCommand {
  id: string;
  label: string;
  description?: string;
  icon?: React.ElementType;
  shortcut?: string;
  onExecute: () => void;
  category?: string;
}

interface CommandPaletteProps {
  commands?: CommandPaletteCommand[];
}

const defaultCommands: CommandPaletteCommand[] = [
  {
    id: 'schema-browser',
    label: 'Go to Schema Browser',
    description: 'View database schemas and tables',
    icon: FileSearch,
    onExecute: () => {
      // Will be handled by navigation
    },
  },
  {
    id: 'er-diagram',
    label: 'Go to ER Diagram',
    description: 'View entity relationship diagram',
    icon: Workflow,
    onExecute: () => {
      // Will be handled by navigation
    },
  },
  {
    id: 'query-builder',
    label: 'Go to Query Builder',
    description: 'Execute SQL queries',
    icon: Code2,
    onExecute: () => {
      // Will be handled by navigation
    },
  },
];

// Separate provider component
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  
  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function CommandPalette({ commands = defaultCommands }: CommandPaletteProps) {
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const [recentCommands, setRecentCommands] = useState<CommandPaletteCommand[]>([]);

  // Load recent commands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentCommands(parsed);
      }
    } catch (error) {
      // Silently handle parse errors
    }
  }, []);

  // Save command to recent commands
  const saveToRecent = useCallback((command: CommandPaletteCommand) => {
    try {
      setRecentCommands((prev) => {
        const updated = [
          command,
          ...prev.filter(cmd => cmd.id !== command.id)
        ].slice(0, MAX_RECENT_COMMANDS);
        
        localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      // Silently handle storage errors
    }
  }, []);

  // Open command palette with Ctrl+K (but not Ctrl+Shift+K)
  useKeyboardShortcut(
    'k',
    () => setOpen(true),
    { ctrl: true, shift: false }
  );

  // Also open with Ctrl+P (quick open/search)
  useKeyboardShortcut(
    'p',
    () => setOpen(true),
    { ctrl: true, shift: false }
  );

  // Close with Escape
  useKeyboardShortcut(
    'Escape',
    () => setOpen(false),
    {},
    { target: open ? document : null, enabled: open }
  );

  // Enhance commands with navigation and recent tracking
  const enhancedCommands = useMemo(() => {
    return commands.map((cmd) => {
      let enhancedCmd: CommandPaletteCommand;
      
      if (cmd.id === 'schema-browser') {
        enhancedCmd = {
          ...cmd,
          onExecute: () => {
            saveToRecent(cmd);
            navigate('/');
            setOpen(false);
          },
        };
      } else if (cmd.id === 'er-diagram') {
        enhancedCmd = {
          ...cmd,
          onExecute: () => {
            saveToRecent(cmd);
            navigate('/diagram');
            setOpen(false);
          },
        };
      } else if (cmd.id === 'query-builder') {
        enhancedCmd = {
          ...cmd,
          onExecute: () => {
            saveToRecent(cmd);
            navigate('/query');
            setOpen(false);
          },
        };
      } else {
        enhancedCmd = {
          ...cmd,
          onExecute: () => {
            saveToRecent(cmd);
            cmd.onExecute();
            setOpen(false);
          },
        };
      }
      
      return enhancedCmd;
    });
  }, [commands, navigate, saveToRecent]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {recentCommands.length > 0 && (
            <>
              <CommandGroup heading="Recent">
                {recentCommands.map((command) => {
                  const enhanced = enhancedCommands.find(c => c.id === command.id) || command;
                  return (
                    <CommandItem
                      key={command.id}
                      value={command.label}
                      onSelect={enhanced.onExecute}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{command.label}</span>
                      {command.description && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {command.description}
                        </span>
                      )}
                      {command.shortcut && (
                        <CommandShortcut>{command.shortcut}</CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          
          <CommandGroup heading="Navigation">
            {enhancedCommands.map((command) => (
              <CommandItem
                key={command.id}
                value={command.label}
                onSelect={command.onExecute}
              >
                {command.icon && <command.icon className="mr-2 h-4 w-4" />}
                <span>{command.label}</span>
                {command.description && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {command.description}
                  </span>
                )}
                {command.shortcut && (
                  <CommandShortcut>{command.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
  );
}

