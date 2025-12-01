import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Plus, Power, PowerOff, Edit, Trash2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConnection } from "@/contexts/ConnectionContext";
import { connectionsService } from "@/lib/api/services/connections.service";
import { ConnectionDialog } from "@/components/connection/ConnectionDialog";
import type { Connection } from "@/lib/api/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { activeConnection, setActiveConnection, connections } = useConnection();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

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
      // If deleted connection was active, clear it
      if (activeConnection?.id === id) {
        setActiveConnection(null);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete connection');
    },
  });

  const handleNewConnection = () => {
    setEditingConnection(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (conn: Connection) => {
    setEditingConnection(conn);
    setIsDialogOpen(true);
  };

  const handleConnect = (id: string) => {
    connectMutation.mutate(id);
  };

  const handleDisconnect = (id: string) => {
    disconnectMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    const conn = connections.find(c => c.id === id);
    if (!conn) return;
    if (!confirm(`Are you sure you want to delete "${conn.name}"?`)) {
      return;
    }
    deleteMutation.mutate(id);
  };

  const handleSwitch = (conn: Connection) => {
    setActiveConnection(conn);
    if (conn.status !== 'connected') {
      handleConnect(conn.id);
    }
  };

  const formatLastConnected = (conn: Connection) => {
    // This would ideally come from the backend, but for now we'll show status
    if (conn.status === 'connected') {
      return 'Connected';
    }
    return 'Not connected';
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Database Connections"
        description="Manage your database connections and credentials"
        icon={<Database className="h-6 w-6 text-primary" />}
        actions={
          <Button onClick={handleNewConnection} className="gap-2">
            <Plus className="h-4 w-4" />
            New Connection
          </Button>
        }
      />

      <div className="container mx-auto px-6 py-8">
        {connections.length === 0 ? (
          <Card className="card-hover">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground mb-4">No database connections</p>
              <Button onClick={handleNewConnection} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Connection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => {
              const isActive = activeConnection?.id === connection.id;
              const isConnected = connection.status === 'connected';
              const isConnecting = connectMutation.isPending && connectMutation.variables === connection.id;
              const isDisconnecting = disconnectMutation.isPending && disconnectMutation.variables === connection.id;

              return (
                <Card 
                  key={connection.id} 
                  className={cn(
                    "card-hover cursor-pointer transition-all",
                    isActive && "border-primary border-2"
                  )}
                  onClick={() => handleSwitch(connection)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <CardTitle className="text-base font-mono uppercase tracking-wider text-primary">
                          {connection.name}
                        </CardTitle>
                        <CardDescription className="font-mono text-[10px]">
                          {connection.host}:{connection.port}
                        </CardDescription>
                      </div>
                      <div className="font-mono text-xs">
                        {isConnected ? (
                          <span className="text-success text-glow">●</span>
                        ) : (
                          <span className="text-muted-foreground">○</span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">database:</span>
                        <span className="text-foreground">{connection.database}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">status:</span>
                        <Badge variant={isConnected ? "default" : "secondary"} className="font-mono">
                          {isConnected ? "[ONLINE]" : "[OFFLINE]"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-muted-foreground">last_ping:</span>
                        <span className="text-[10px]">{formatLastConnected(connection)}</span>
                      </div>
                      {isActive && (
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-muted-foreground">active:</span>
                          <Badge variant="outline" className="font-mono border-primary text-primary">
                            [ACTIVE]
                          </Badge>
                        </div>
                      )}
                      <div className="flex gap-2 pt-3 border-t border-border">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isConnected) {
                              handleDisconnect(connection.id);
                            } else {
                              handleConnect(connection.id);
                            }
                          }}
                          disabled={isConnecting || isDisconnecting}
                        >
                          {isConnecting || isDisconnecting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isConnected ? (
                            <>
                              <PowerOff className="w-3 h-3 mr-1" />
                              Disconnect
                            </>
                          ) : (
                            <>
                              <Power className="w-3 h-3 mr-1" />
                              Connect
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(connection);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(connection.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Connection Dialog */}
      <ConnectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        connection={editingConnection}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['connections'] });
          setIsDialogOpen(false);
          setEditingConnection(null);
        }}
      />
    </div>
  );
}

