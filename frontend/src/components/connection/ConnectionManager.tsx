import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Database, Trash2, Edit, Play, Power, PowerOff } from "lucide-react";
import { mockConnections, Connection } from "@/lib/mockData";
import { ConnectionDialog } from "./ConnectionDialog";
import { toast } from "sonner";

interface ConnectionManagerProps {
  children?: React.ReactNode;
}

export const ConnectionManager = ({ children }: ConnectionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [connections, setConnections] = useState<Connection[]>(mockConnections);

  const filteredConnections = connections.filter(conn =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.database.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = (id: string) => {
    setConnections(prev =>
      prev.map(conn =>
        conn.id === id
          ? { ...conn, status: "connected" as const, lastConnected: new Date() }
          : conn
      )
    );
    toast.success(`Connected to ${connections.find(c => c.id === id)?.name}`);
  };

  const handleDisconnect = (id: string) => {
    setConnections(prev =>
      prev.map(conn =>
        conn.id === id ? { ...conn, status: "disconnected" as const } : conn
      )
    );
    toast.info(`Disconnected from ${connections.find(c => c.id === id)?.name}`);
  };

  const handleDelete = (id: string) => {
    const conn = connections.find(c => c.id === id);
    setConnections(prev => prev.filter(c => c.id !== id));
    toast.success(`Deleted connection "${conn?.name}"`);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Connection Manager
          </SheetTitle>
          <SheetDescription>
            Manage your database connections. Add, edit, or remove connections.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ConnectionDialog>
              <Button variant="default">Add New</Button>
            </ConnectionDialog>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredConnections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No connections found</p>
              </div>
            ) : (
              filteredConnections.map(conn => (
                <Card key={conn.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              conn.status === "connected"
                                ? "bg-success animate-pulse"
                                : conn.status === "error"
                                ? "bg-destructive"
                                : "bg-muted-foreground"
                            }`}
                          />
                          <h3 className="font-semibold truncate">{conn.name}</h3>
                          <Badge variant={conn.status === "connected" ? "default" : "secondary"} className="text-xs">
                            {conn.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conn.username}@{conn.host}:{conn.port}/{conn.database}
                        </p>
                        {conn.lastConnected && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last connected: {conn.lastConnected.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        {conn.status === "connected" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDisconnect(conn.id)}
                          >
                            <PowerOff className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleConnect(conn.id)}
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(conn.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
