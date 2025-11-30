import { Database, ChevronDown, Settings, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConnection } from "@/contexts/ConnectionContext";
import { ConnectionManager } from "@/components/connection/ConnectionManager";
import { ThemeToggle } from "@/components/theme";
import { KeyboardShortcutsDialog } from "@/components/keyboard";
import { Keyboard } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

export const Header = () => {
  const { activeConnection, setActiveConnection, connections } = useConnection();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { open: openSettings } = useSettings();

  // Global search shortcut (Ctrl+Shift+F or Cmd+Shift+F)
  useKeyboardShortcut(
    'f',
    () => {
      setSearchOpen(true);
    },
    { ctrl: true, shift: true }
  );
  useKeyboardShortcut(
    'f',
    () => {
      setSearchOpen(true);
    },
    { meta: true, shift: true }
  );

  return (
    <>
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold">PostgreSQL Visualizer</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSearchOpen(true)}
          title="Global Search (Ctrl+Shift+F)"
        >
          <Search className="w-4 h-4" />
        </Button>
        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[200px] justify-between" disabled={!activeConnection}>
              <div className="flex items-center gap-2">
                {activeConnection && (
                  <>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activeConnection.status === "connected"
                          ? "bg-success"
                          : "bg-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">{activeConnection.name}</span>
                  </>
                )}
                {!activeConnection && (
                  <span className="text-muted-foreground">No connection</span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[250px]">
            {connections.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                No connections available
              </DropdownMenuItem>
            ) : (
              connections.map((conn) => (
                <DropdownMenuItem
                  key={conn.id}
                  onClick={() => setActiveConnection(conn)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        conn.status === "connected" ? "bg-success" : "bg-muted-foreground"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{conn.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {conn.host}:{conn.port}
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard Shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-4 h-4" />
        </Button>

        <ConnectionManager>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => openSettings()}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </ConnectionManager>
      </div>
    </header>
    </>
  );
};
