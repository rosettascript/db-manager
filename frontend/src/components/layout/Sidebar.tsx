import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Database,
  Table2,
  Workflow,
  Code2,
  FileSearch,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import type { Schema, Table } from "@/lib/api/types";
import { NavLink } from "@/components/NavLink";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DeleteTableDialog } from "@/components/schema-management/DeleteTableDialog";
import { DeleteSchemaDialog } from "@/components/schema-management/DeleteSchemaDialog";
import { toast } from "sonner";

export const Sidebar = () => {
  const { activeConnection } = useConnection();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(["public"]));
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  
  // Delete dialog state
  const [deleteTableDialog, setDeleteTableDialog] = useState<{
    open: boolean;
    schema: string;
    table: string;
  } | null>(null);
  const [deleteSchemaDialog, setDeleteSchemaDialog] = useState<{
    open: boolean;
    schema: string;
  } | null>(null);
  const [tableDependencies, setTableDependencies] = useState<{
    hasDependencies: boolean;
    dependentTables: Array<{ schema: string; table: string; constraint: string }>;
  } | null>(null);
  const [schemaDependencies, setSchemaDependencies] = useState<{
    hasDependencies: boolean;
    objects: Array<{ type: string; name: string }>;
    dependentSchemas: string[];
  } | null>(null);

  // Fetch schemas
  const {
    data: schemas = [],
    isLoading: schemasLoading,
  } = useQuery<Schema[]>({
    queryKey: ['schemas', activeConnection?.id],
    queryFn: () => schemasService.getSchemas(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected',
    staleTime: 60000, // Consider fresh for 1 minute
  });

  // Fetch tables
  const {
    data: tables = [],
    isLoading: tablesLoading,
  } = useQuery<Table[]>({
    queryKey: ['tables', activeConnection?.id],
    queryFn: () => schemasService.getTables(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected',
    staleTime: 60000,
  });

  // Group tables by schema
  const schemasWithTables = useMemo(() => {
    if (!schemas.length || !tables.length) return [];
    
    return schemas.map((schema) => ({
      name: schema.name,
      tables: tables.filter((table) => table.schema === schema.name),
    }));
  }, [schemas, tables]);

  const isLoading = schemasLoading || tablesLoading;

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  // Handle table deletion
  const handleDeleteTableClick = useCallback(async (schema: string, table: string) => {
    if (!activeConnection) return;

    try {
      const deps = await schemasService.checkTableDependencies(
        activeConnection.id,
        schema,
        table,
      );
      setTableDependencies(deps);
      setDeleteTableDialog({ open: true, schema, table });
    } catch (error: any) {
      toast.error("Failed to check dependencies", {
        description: error.message || "Unknown error",
      });
    }
  }, [activeConnection]);

  // Handle schema deletion
  const handleDeleteSchemaClick = useCallback(async (schema: string) => {
    if (!activeConnection) return;

    try {
      const deps = await schemasService.checkSchemaDependencies(
        activeConnection.id,
        schema,
      );
      setSchemaDependencies(deps);
      setDeleteSchemaDialog({ open: true, schema });
    } catch (error: any) {
      toast.error("Failed to check dependencies", {
        description: error.message || "Unknown error",
      });
    }
  }, [activeConnection]);

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async ({ schema, table, options }: {
      schema: string;
      table: string;
      options: { cascade: boolean; confirmName: string };
    }) => {
      if (!activeConnection) throw new Error("No active connection");
      return schemasService.deleteTable(activeConnection.id, schema, table, options);
    },
    onSuccess: (_, variables) => {
      toast.success("Table deleted successfully");
      // Invalidate queries to refresh sidebar
      queryClient.invalidateQueries({ queryKey: ['tables', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['schemas', activeConnection?.id] });
      
      // Navigate away if we're viewing the deleted table
      const currentTableId = location.pathname.split('/table/')[1];
      if (currentTableId === `${variables.schema}.${variables.table}`) {
        navigate('/');
      }
      
      setDeleteTableDialog(null);
      setTableDependencies(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete table", {
        description: error.message || "Unknown error",
      });
    },
  });

  // Delete schema mutation
  const deleteSchemaMutation = useMutation({
    mutationFn: async ({ schema, options }: {
      schema: string;
      options: { cascade: boolean; confirmName: string };
    }) => {
      if (!activeConnection) throw new Error("No active connection");
      return schemasService.deleteSchema(activeConnection.id, schema, options);
    },
    onSuccess: (_, variables) => {
      toast.success("Schema deleted successfully");
      // Invalidate queries to refresh sidebar
      queryClient.invalidateQueries({ queryKey: ['tables', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['schemas', activeConnection?.id] });
      
      // Navigate away if we're viewing a table in the deleted schema
      const currentTableId = location.pathname.split('/table/')[1];
      if (currentTableId?.startsWith(`${variables.schema}.`)) {
        navigate('/');
      }
      
      setDeleteSchemaDialog(null);
      setSchemaDependencies(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete schema", {
        description: error.message || "Unknown error",
      });
    },
  });

  return (
    <aside className="w-64 h-full border-r border-border bg-sidebar flex flex-col overflow-hidden">
      <nav className="flex-shrink-0 p-4 space-y-1">
        <NavLink
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
          activeClassName="bg-sidebar-accent"
        >
          <FileSearch className="w-4 h-4" />
          Schema Browser
        </NavLink>
        <NavLink
          to="/diagram"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
          activeClassName="bg-sidebar-accent"
        >
          <Workflow className="w-4 h-4" />
          ER Diagram
        </NavLink>
        <NavLink
          to="/query"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
          activeClassName="bg-sidebar-accent"
        >
          <Code2 className="w-4 h-4" />
          Query Builder
        </NavLink>
        <NavLink
          to="/indexes"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
          activeClassName="bg-sidebar-accent"
        >
          <TrendingUp className="w-4 h-4" />
          Index Recommendations
        </NavLink>
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto border-t border-sidebar-border">
        <div className="p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">DATABASE</div>
          
          {!activeConnection ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No connection selected</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
              <p className="text-xs">Loading schemas...</p>
            </div>
          ) : schemasWithTables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-6 h-6 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No schemas found</p>
            </div>
          ) : (
            schemasWithTables.map((schema) => (
              <div key={schema.name} className="mb-2">
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      onClick={() => toggleSchema(schema.name)}
                      className="flex items-center gap-1 w-full px-2 py-1.5 text-sm hover:bg-sidebar-accent rounded-md transition-colors"
                    >
                      {expandedSchemas.has(schema.name) ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <Database className="w-3 h-3" />
                      <span className="font-medium">{schema.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {schema.tables.length}
                      </span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchemaClick(schema.name);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Schema
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {expandedSchemas.has(schema.name) && (
                  <div className="ml-4 mt-1 space-y-0.5 animate-fade-in">
                    {schema.tables.map((table, idx) => (
                      <ContextMenu key={table.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            style={{ animation: `fade-in 0.2s ease-out ${idx * 0.05}s both` }}
                          >
                            <NavLink
                              to={`/table/${table.id}`}
                              className="flex items-center gap-1.5 px-2 py-1.5 text-sm hover:bg-sidebar-accent rounded-md transition-colors"
                              activeClassName="bg-sidebar-accent"
                            >
                              <Table2 className="w-3 h-3" />
                              <span className="flex-1 truncate">{table.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {table.rowCount.toLocaleString()}
                              </span>
                            </NavLink>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTableClick(table.schema, table.name);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Table
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Table Dialog */}
      {deleteTableDialog && (
        <DeleteTableDialog
          open={deleteTableDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTableDialog(null);
              setTableDependencies(null);
            }
          }}
          onConfirm={(options) => {
            deleteTableMutation.mutate({
              schema: deleteTableDialog.schema,
              table: deleteTableDialog.table,
              options,
            });
          }}
          schema={deleteTableDialog.schema}
          table={deleteTableDialog.table}
          dependencies={tableDependencies || undefined}
          isDeleting={deleteTableMutation.isPending}
        />
      )}

      {/* Delete Schema Dialog */}
      {deleteSchemaDialog && (
        <DeleteSchemaDialog
          open={deleteSchemaDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteSchemaDialog(null);
              setSchemaDependencies(null);
            }
          }}
          onConfirm={(options) => {
            deleteSchemaMutation.mutate({
              schema: deleteSchemaDialog.schema,
              options,
            });
          }}
          schema={deleteSchemaDialog.schema}
          dependencies={schemaDependencies || undefined}
          isDeleting={deleteSchemaMutation.isPending}
        />
      )}
    </aside>
  );
};
