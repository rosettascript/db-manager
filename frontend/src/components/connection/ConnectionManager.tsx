import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSettings } from "@/contexts/SettingsContext";
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
import { Search, Database, Trash2, Edit, Play, Power, PowerOff, Loader2, RefreshCw } from "lucide-react";
import type { Connection } from "@/lib/api/types";
import { connectionsService } from "@/lib/api/services/connections.service";
import { ConnectionDialog } from "./ConnectionDialog";
import { toast } from "sonner";
import { NoConnectionsEmptyState } from "@/components/empty/EmptyState";

interface ConnectionManagerProps {
  children?: React.ReactNode;
}

export const ConnectionManager = ({ children }: ConnectionManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { isOpen: isSheetOpen, close: closeSheet } = useSettings();
  const queryClient = useQueryClient();

  // Fetch connections from API
  const {
    data: connections = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: () => connectionsService.list(),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (id: string) => connectionsService.connect(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status', id] });
      const conn = connections.find(c => c.id === id);
      toast.success(`Connected to ${conn?.name || 'database'}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to connect to database');
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (id: string) => connectionsService.disconnect(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['connection-status', id] });
      const conn = connections.find(c => c.id === id);
      toast.info(`Disconnected from ${conn?.name || 'database'}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect from database');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => connectionsService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      const conn = connections.find(c => c.id === id);
      toast.success(`Deleted connection "${conn?.name || 'connection'}"`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete connection');
    },
  });

  const filteredConnections = connections.filter(conn =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.database.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = (id: string) => {
    connectMutation.mutate(id);
  };

  const handleDisconnect = (id: string) => {
    disconnectMutation.mutate(id);
  };

  const handleDelete = async (id: string) => {
    const conn = connections.find(c => c.id === id);
    if (!conn) return;

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${conn.name}"?`)) {
      return;
    }

    deleteMutation.mutate(id);
  };

  const handleEdit = (conn: Connection) => {
    setEditingConnection(conn);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingConnection(null);
  };

  const handleNewConnection = () => {
    setEditingConnection(null);
    setIsDialogOpen(true);
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={(open) => open ? null : closeSheet()}>
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
                disabled={isLoading}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
              title="Refresh connections"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="default" onClick={handleNewConnection} disabled={isLoading}>
              Add New
            </Button>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <Loader2 className="w-12 h-12 mx-auto mb-3 animate-spin opacity-50" />
                <p>Loading connections...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-destructive mb-2">Failed to load connections</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : 'An error occurred'}
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try Again
                </Button>
              </div>
            ) : filteredConnections.length === 0 ? (
              searchQuery ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No connections match your search</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                </div>
              ) : (
                <NoConnectionsEmptyState
                  onCreateConnection={() => setIsDialogOpen(true)}
                />
              )
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
                            Last connected: {new Date(conn.lastConnected).toLocaleString()}
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
                            disabled={disconnectMutation.isPending}
                            title="Disconnect"
                          >
                            {disconnectMutation.isPending && disconnectMutation.variables === conn.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <PowerOff className="w-4 h-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleConnect(conn.id)}
                            disabled={connectMutation.isPending}
                            title="Connect"
                          >
                            {connectMutation.isPending && connectMutation.variables === conn.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(conn)}
                          title="Edit connection"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(conn.id)}
                          disabled={deleteMutation.isPending}
                          title="Delete connection"
                        >
                          {deleteMutation.isPending && deleteMutation.variables === conn.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Connection Dialog */}
        <ConnectionDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          connection={editingConnection}
          onSuccess={() => {
            handleDialogClose();
            refetch();
          }}
        />
      </SheetContent>
    </Sheet>
  );
};
