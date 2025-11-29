import { Database, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockConnections } from "@/lib/mockData";
import { useState } from "react";
import { ConnectionManager } from "@/components/connection/ConnectionManager";

export const Header = () => {
  const [activeConnection, setActiveConnection] = useState(mockConnections[0]);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-primary" />
          <span className="text-lg font-semibold">PostgreSQL Visualizer</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    activeConnection.status === "connected"
                      ? "bg-success"
                      : "bg-muted-foreground"
                  }`}
                />
                <span className="font-medium">{activeConnection.name}</span>
              </div>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[250px]">
            {mockConnections.map((conn) => (
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
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ConnectionManager>
          <Button variant="ghost" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </ConnectionManager>
      </div>
    </header>
  );
};
