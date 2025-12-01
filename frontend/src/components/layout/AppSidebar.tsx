import { Database, Table2, Workflow, Code2, TrendingUp, Settings, Search, Command, ChevronRight, ChevronDown, Loader2, AlertCircle, Trash2, FunctionSquare, Eye, Hash, List, Plus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommandPalette } from "@/components/keyboard/CommandPalette";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import { connectionsService } from "@/lib/api/services/connections.service";
import type { Schema, Table, DatabaseFunction, DatabaseView, DatabaseIndex, DatabaseEnum, Connection } from "@/lib/api/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DeleteTableDialog } from "@/components/schema-management/DeleteTableDialog";
import { DeleteSchemaDialog } from "@/components/schema-management/DeleteSchemaDialog";
import { toast } from "sonner";

// Helper functions to persist expanded state
const loadExpandedState = (key: string, defaultValue: Set<string>): Set<string> => {
  try {
    const stored = localStorage.getItem(`sidebar-expanded-${key}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(parsed);
    }
  } catch (e) {
    // Ignore errors
  }
  return defaultValue;
};

const saveExpandedState = (key: string, value: Set<string>) => {
  try {
    localStorage.setItem(`sidebar-expanded-${key}`, JSON.stringify(Array.from(value)));
  } catch (e) {
    // Ignore errors
  }
};

const navItems = [
  { title: "Schema Browser", url: "/", icon: Table2 },
  { title: "ER Diagram", url: "/diagram", icon: Workflow },
  { title: "Query Builder", url: "/query", icon: Code2 },
  { title: "Index Recommendations", url: "/indexes", icon: TrendingUp },
];

export function AppSidebar() {
  const { setOpen } = useCommandPalette();
  const { activeConnection, setActiveConnection, connections } = useConnection();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(() => 
    loadExpandedState('schemas', new Set(["public"]))
  );
  const [expandedObjectTypes, setExpandedObjectTypes] = useState<Set<string>>(() => 
    loadExpandedState('objectTypes', new Set())
  );
  const [functionCategoryFilter, setFunctionCategoryFilter] = useState<'user' | 'all'>('user');
  
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
    staleTime: 60000,
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

  // Fetch functions
  const {
    data: userFunctions = [],
    isLoading: userFunctionsLoading,
  } = useQuery<DatabaseFunction[]>({
    queryKey: ['functions', activeConnection?.id, 'user'],
    queryFn: () => schemasService.getFunctions(activeConnection!.id, undefined, 'user'),
    enabled: !!activeConnection && activeConnection.status === 'connected' && functionCategoryFilter === 'user',
    staleTime: 60000,
  });

  const {
    data: allFunctions = [],
    isLoading: allFunctionsLoading,
  } = useQuery<DatabaseFunction[]>({
    queryKey: ['functions', activeConnection?.id, 'all'],
    queryFn: () => schemasService.getFunctions(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected' && functionCategoryFilter === 'all',
    staleTime: 60000,
  });

  const functions = functionCategoryFilter === 'all' ? allFunctions : userFunctions;
  const functionsLoading = functionCategoryFilter === 'all' ? allFunctionsLoading : userFunctionsLoading;

  // Fetch views
  const {
    data: views = [],
    isLoading: viewsLoading,
  } = useQuery<DatabaseView[]>({
    queryKey: ['views', activeConnection?.id],
    queryFn: () => schemasService.getViews(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected',
    staleTime: 60000,
  });

  // Fetch indexes
  const {
    data: indexes = [],
    isLoading: indexesLoading,
  } = useQuery<DatabaseIndex[]>({
    queryKey: ['indexes', activeConnection?.id],
    queryFn: () => schemasService.getIndexes(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected',
    staleTime: 60000,
  });

  // Fetch enums
  const {
    data: enums = [],
    isLoading: enumsLoading,
  } = useQuery<DatabaseEnum[]>({
    queryKey: ['enums', activeConnection?.id],
    queryFn: () => schemasService.getEnums(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected',
    staleTime: 60000,
  });

  // Group all objects by schema
  const schemasWithObjects = useMemo(() => {
    if (!schemas.length) return [];
    
    return schemas.map((schema) => ({
      name: schema.name,
      tables: tables.filter((table) => table.schema === schema.name),
      functions: functions.filter((func) => func.schema === schema.name),
      views: views.filter((view) => view.schema === schema.name),
      indexes: indexes.filter((idx) => idx.schema === schema.name),
      enums: enums.filter((enumType) => enumType.schema === schema.name),
    }));
  }, [schemas, tables, functions, views, indexes, enums]);

  const isLoading = schemasLoading || tablesLoading || functionsLoading || viewsLoading || indexesLoading || enumsLoading;

  // Auto-expand schema and object type based on current route
  useEffect(() => {
    if (!location.pathname || isLoading || !schemas.length) return;

    const path = location.pathname;
    let schema: string | null = null;
    let objectType: string | null = null;

    if (path.startsWith('/table/')) {
      const tableId = path.split('/table/')[1];
      if (tableId) {
        const parts = tableId.split('.');
        if (parts.length >= 2) {
          schema = parts[0];
          objectType = 'tables';
        }
      }
    } else if (path.startsWith('/function/')) {
      const functionId = path.split('/function/')[1];
      if (functionId) {
        const match = functionId.match(/^([^.]+)\./);
        if (match) {
          schema = match[1];
          objectType = 'functions';
        }
      }
    } else if (path.startsWith('/view/')) {
      const viewId = path.split('/view/')[1];
      if (viewId) {
        const parts = viewId.split('.');
        if (parts.length >= 2) {
          schema = parts[0];
          objectType = 'views';
        }
      }
    } else if (path.startsWith('/index/')) {
      const indexId = path.split('/index/')[1];
      if (indexId) {
        const parts = indexId.split('.');
        if (parts.length >= 2) {
          schema = parts[0];
          objectType = 'indexes';
        }
      }
    } else if (path.startsWith('/enum/')) {
      const enumId = path.split('/enum/')[1];
      if (enumId) {
        const parts = enumId.split('.');
        if (parts.length >= 2) {
          schema = parts[0];
          objectType = 'enums';
        }
      }
    }

    if (schema && objectType && schemas.some(s => s.name === schema)) {
      setExpandedSchemas(prev => {
        const newSet = new Set(prev);
        if (!newSet.has(schema!)) {
          newSet.add(schema!);
          saveExpandedState('schemas', newSet);
          return newSet;
        }
        return prev;
      });

      const objectTypeKey = `${schema}-${objectType}`;
      setExpandedObjectTypes(prev => {
        const newSet = new Set(prev);
        if (!newSet.has(objectTypeKey)) {
          newSet.add(objectTypeKey);
          saveExpandedState('objectTypes', newSet);
          return newSet;
        }
        return prev;
      });
    }
  }, [location.pathname, isLoading, schemas]);

  const toggleSchema = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
    saveExpandedState('schemas', newExpanded);
  };

  const toggleObjectType = (key: string) => {
    const newExpanded = new Set(expandedObjectTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedObjectTypes(newExpanded);
    saveExpandedState('objectTypes', newExpanded);
  };

  const handleDeleteTableClick = useCallback(async (schema: string, table: string) => {
    if (!activeConnection) return;
    try {
      const deps = await schemasService.checkTableDependencies(activeConnection.id, schema, table);
      setTableDependencies(deps);
      setDeleteTableDialog({ open: true, schema, table });
    } catch (error: any) {
      toast.error("Failed to check dependencies", { description: error.message || "Unknown error" });
    }
  }, [activeConnection]);

  const handleDeleteSchemaClick = useCallback(async (schema: string) => {
    if (!activeConnection) return;
    try {
      const deps = await schemasService.checkSchemaDependencies(activeConnection.id, schema);
      setSchemaDependencies(deps);
      setDeleteSchemaDialog({ open: true, schema });
    } catch (error: any) {
      toast.error("Failed to check dependencies", { description: error.message || "Unknown error" });
    }
  }, [activeConnection]);

  const deleteTableMutation = useMutation({
    mutationFn: async ({ schema, table, options }: { schema: string; table: string; options: { cascade: boolean; confirmName: string } }) => {
      if (!activeConnection) throw new Error("No active connection");
      return schemasService.deleteTable(activeConnection.id, schema, table, options);
    },
    onSuccess: (_, variables) => {
      toast.success("Table deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['tables', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['schemas', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['indexes', activeConnection?.id] });
      const currentTableId = location.pathname.split('/table/')[1];
      if (currentTableId === `${variables.schema}.${variables.table}`) {
        navigate('/');
      }
      setDeleteTableDialog(null);
      setTableDependencies(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete table", { description: error.message || "Unknown error" });
    },
  });

  const deleteSchemaMutation = useMutation({
    mutationFn: async ({ schema, options }: { schema: string; options: { cascade: boolean; confirmName: string } }) => {
      if (!activeConnection) throw new Error("No active connection");
      return schemasService.deleteSchema(activeConnection.id, schema, options);
    },
    onSuccess: (_, variables) => {
      toast.success("Schema deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['tables', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['schemas', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['functions', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['views', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['indexes', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['enums', activeConnection?.id] });
      const currentTableId = location.pathname.split('/table/')[1];
      if (currentTableId?.startsWith(`${variables.schema}.`)) {
        navigate('/');
      }
      setDeleteSchemaDialog(null);
      setSchemaDependencies(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete schema", { description: error.message || "Unknown error" });
    },
  });

  // Connection switching
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

  const handleConnectionSwitch = async (connectionId: string) => {
    const conn = connections.find(c => c.id === connectionId);
    if (!conn) return;
    
    setActiveConnection(conn);
    
    // Auto-connect if not connected
    if (conn.status !== 'connected') {
      connectMutation.mutate(connectionId);
    }
  };
  
  return (
    <>
      <Sidebar className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center bg-primary/10 border border-primary/20">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-primary">DB Visualizer</h2>
              <p className="text-xs text-muted-foreground">Database Management</p>
            </div>
          </div>
          {/* Connection Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Database Connection</label>
            <Select
              value={activeConnection?.id || ""}
              onValueChange={handleConnectionSwitch}
            >
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {activeConnection && (
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      activeConnection.status === 'connected' ? "bg-success" : "bg-muted-foreground"
                    )} />
                  )}
                  <SelectValue placeholder="Select a connection">
                    {activeConnection?.name || "No connection"}
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                {connections.length === 0 ? (
                  <SelectItem value="none" disabled>No connections</SelectItem>
                ) : (
                  connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2 w-full">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          conn.status === 'connected' ? "bg-success" : "bg-muted-foreground"
                        )} />
                        <span className="flex-1 truncate">{conn.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {conn.database}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          {/* Quick Search */}
          <div className="px-2 pb-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left text-sm">Search...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 border px-1.5 font-mono text-[10px] sm:flex">
                <Command className="h-3 w-3" />K
              </kbd>
            </Button>
          </div>

          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/"}
                        className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium border-l-2 border-primary"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Database Browser Section */}
          {activeConnection && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Database
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
                    <p className="text-xs">Loading schemas...</p>
                  </div>
                ) : schemasWithObjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-6 h-6 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">No schemas found</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {schemasWithObjects.map((schema) => {
                      const totalObjects = schema.tables.length + schema.functions.length + schema.views.length + schema.indexes.length + schema.enums.length;
                      const schemaKey = schema.name;
                      const tablesKey = `${schemaKey}-tables`;
                      const functionsKey = `${schemaKey}-functions`;
                      const viewsKey = `${schemaKey}-views`;
                      const indexesKey = `${schemaKey}-indexes`;
                      const enumsKey = `${schemaKey}-enums`;

                      return (
                        <div key={schema.name} className="mb-2">
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <button
                                onClick={() => toggleSchema(schema.name)}
                                className="flex items-center gap-1 w-full px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors"
                              >
                                {expandedSchemas.has(schema.name) ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                                <Database className="w-3 h-3" />
                                <span className="font-medium">{schema.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{totalObjects}</span>
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
                              {/* Tables */}
                              {schema.tables.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => toggleObjectType(tablesKey)}
                                    className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {expandedObjectTypes.has(tablesKey) ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <Table2 className="w-3 h-3" />
                                    <span>Tables ({schema.tables.length})</span>
                                  </button>
                                  {expandedObjectTypes.has(tablesKey) && (
                                    <div className="ml-4 mt-0.5 space-y-0.5">
                                      {schema.tables.map((table) => (
                                        <ContextMenu key={table.id}>
                                          <ContextMenuTrigger asChild>
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                navigate(`/table/${table.id}`);
                                              }}
                                              className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-sidebar-accent transition-colors w-full text-left",
                                                location.pathname === `/table/${table.id}` && "bg-sidebar-accent"
                                              )}
                                            >
                                              <Table2 className="w-3 h-3" />
                                              <span className="flex-1 truncate">{table.name}</span>
                                              <span className="text-xs text-muted-foreground">{table.rowCount.toLocaleString()}</span>
                                            </button>
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
                              )}

                              {/* Functions */}
                              {schema.functions.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleObjectType(functionsKey)}
                                      className="flex items-center gap-1 flex-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {expandedObjectTypes.has(functionsKey) ? (
                                        <ChevronDown className="w-3 h-3" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                      <FunctionSquare className="w-3 h-3" />
                                      <span>Functions ({schema.functions.length})</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFunctionCategoryFilter(functionCategoryFilter === 'all' ? 'user' : 'all');
                                      }}
                                      className="px-1.5 py-0.5 text-[10px] bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors"
                                      title={functionCategoryFilter === 'all' ? 'Show only user-defined functions' : 'Show all functions'}
                                    >
                                      {functionCategoryFilter === 'all' ? 'User' : 'All'}
                                    </button>
                                  </div>
                                  {expandedObjectTypes.has(functionsKey) && (
                                    <div className="ml-4 mt-0.5 space-y-0.5">
                                      {schema.functions.map((func) => (
                                        <button
                                          key={func.id}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            navigate(`/function/${func.id}`);
                                          }}
                                          className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-sidebar-accent transition-colors w-full text-left",
                                            location.pathname.startsWith(`/function/${func.id}`) && "bg-sidebar-accent"
                                          )}
                                        >
                                          <FunctionSquare className="w-3 h-3" />
                                          <span className="flex-1 truncate">{func.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Views */}
                              {schema.views.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => toggleObjectType(viewsKey)}
                                    className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {expandedObjectTypes.has(viewsKey) ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <Eye className="w-3 h-3" />
                                    <span>Views ({schema.views.length})</span>
                                  </button>
                                  {expandedObjectTypes.has(viewsKey) && (
                                    <div className="ml-4 mt-0.5 space-y-0.5">
                                      {schema.views.map((view) => (
                                        <button
                                          key={view.id}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            navigate(`/view/${view.id}`);
                                          }}
                                          className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-sidebar-accent transition-colors w-full text-left",
                                            location.pathname === `/view/${view.id}` && "bg-sidebar-accent"
                                          )}
                                        >
                                          <Eye className="w-3 h-3" />
                                          <span className="flex-1 truncate">{view.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Indexes */}
                              {schema.indexes.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => toggleObjectType(indexesKey)}
                                    className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {expandedObjectTypes.has(indexesKey) ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <Hash className="w-3 h-3" />
                                    <span>Indexes ({schema.indexes.length})</span>
                                  </button>
                                  {expandedObjectTypes.has(indexesKey) && (
                                    <div className="ml-4 mt-0.5 space-y-0.5">
                                      {schema.indexes.map((index) => (
                                        <button
                                          key={index.id}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            navigate(`/index/${index.id}`);
                                          }}
                                          className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-sidebar-accent transition-colors w-full text-left",
                                            location.pathname === `/index/${index.id}` && "bg-sidebar-accent"
                                          )}
                                        >
                                          <Hash className="w-3 h-3" />
                                          <span className="flex-1 truncate">{index.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Enums */}
                              {schema.enums.length > 0 && (
                                <div>
                                  <button
                                    onClick={() => toggleObjectType(enumsKey)}
                                    className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {expandedObjectTypes.has(enumsKey) ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <List className="w-3 h-3" />
                                    <span>Enums ({schema.enums.length})</span>
                                  </button>
                                  {expandedObjectTypes.has(enumsKey) && (
                                    <div className="ml-4 mt-0.5 space-y-0.5">
                                      {schema.enums.map((enumType) => (
                                        <button
                                          key={enumType.id}
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            navigate(`/enum/${enumType.id}`);
                                          }}
                                          className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-sidebar-accent transition-colors w-full text-left",
                                            location.pathname === `/enum/${enumType.id}` && "bg-sidebar-accent"
                                          )}
                                        >
                                          <List className="w-3 h-3" />
                                          <span className="flex-1 truncate">{enumType.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Settings
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to="/settings" 
                      className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Delete Dialogs */}
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

    </>
  );
}
