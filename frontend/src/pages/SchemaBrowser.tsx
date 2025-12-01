import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Database, Table2, RefreshCcw, Loader2, AlertCircle, Download } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import type { Schema, Table, DatabaseStats } from "@/lib/api/types";
import { NavLink } from "@/components/NavLink";
import { toast } from "sonner";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { ConnectionErrorHandler } from "@/components/error/ConnectionErrorHandler";
import { LoadingSkeleton } from "@/components/loading/LoadingSkeleton";
import { SchemaDumpDialog } from "@/components/schema-dump/SchemaDumpDialog";
import { NoTablesEmptyState } from "@/components/empty/EmptyState";

const SchemaBrowser = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { activeConnection } = useConnection();
  const queryClient = useQueryClient();
  
  // Debounce search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Fetch schemas
  const {
    data: schemas = [],
    isLoading: schemasLoading,
    isError: schemasError,
    error: schemasErrorObj,
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
    isError: tablesError,
    error: tablesErrorObj,
  } = useQuery<Table[]>({
    queryKey: ['tables', activeConnection?.id],
    queryFn: () => schemasService.getTables(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected',
    staleTime: 60000,
  });

  // Fetch database stats
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErrorObj,
  } = useQuery<DatabaseStats>({
    queryKey: ['database-stats', activeConnection?.id],
    queryFn: () => schemasService.getDatabaseStats(activeConnection!.id),
    enabled: !!activeConnection && activeConnection.status === 'connected',
    staleTime: 60000,
  });

  // Refresh schemas mutation
  const refreshMutation = useMutation({
    mutationFn: () => schemasService.refreshSchemas(activeConnection!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['tables', activeConnection?.id] });
      queryClient.invalidateQueries({ queryKey: ['database-stats', activeConnection?.id] });
      toast.success('Schema cache refreshed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to refresh schema cache');
    },
  });

  const isLoading = schemasLoading || tablesLoading || statsLoading;
  const isError = schemasError || tablesError || statsError;
  // Get the first available error object
  const error = schemasErrorObj || tablesErrorObj || statsErrorObj;

  // Memoized filtered tables
  const filteredTables = useMemo(() => {
    if (!debouncedSearchQuery) return tables;
    
    const query = debouncedSearchQuery.toLowerCase();
    return tables.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.schema.toLowerCase().includes(query) ||
        table.columns.some((col) => col.name.toLowerCase().includes(query))
    );
  }, [debouncedSearchQuery, tables]);

  // Helper function to format table ID for navigation
  // Uses table.id which is formatted as "schema_tableName" from backend
  const getTableRoute = (table: Table) => {
    return `/table/${table.id}`;
  };

  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Schema Browser</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Explore database structure and relationships
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setExportDialogOpen(true)}
              disabled={!activeConnection}
            >
              <Download className="w-4 h-4" />
              Export Schema
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => refreshMutation.mutate()}
              disabled={!activeConnection || refreshMutation.isPending}
            >
              {refreshMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-4 h-4" />
                  Refresh Schema
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Schemas</p>
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.schemaCount ?? schemas.length ?? 0}</p>
                  )}
                </div>
                <Database className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tables</p>
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.tableCount ?? tables.length ?? 0}</p>
                  )}
                </div>
                <Table2 className="w-8 h-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Rows</p>
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {stats?.totalRows?.toLocaleString() ?? tables.reduce((sum, t) => sum + t.rowCount, 0).toLocaleString() ?? 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Database Size</p>
                  {statsLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {stats?.totalSize ? stats.totalSize.replace(/[^0-9.]/g, '') + ' ' + stats.totalSize.replace(/[0-9.]/g, '') : '0 MB'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!activeConnection ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium mb-2">No Connection Selected</p>
            <p className="text-sm">Please select a database connection to view schemas and tables.</p>
          </div>
        ) : isLoading ? (
          <div className="p-6">
            <LoadingSkeleton variant="grid" rows={6} />
          </div>
        ) : isError ? (
          <div className="p-6">
            <ErrorDisplay
              error={error}
              title="Failed to load schemas"
              description="Please ensure the connection is active and try again."
              onRetry={() => {
                queryClient.invalidateQueries({ queryKey: ['schemas', activeConnection?.id] });
                queryClient.invalidateQueries({ queryKey: ['tables', activeConnection?.id] });
                queryClient.invalidateQueries({ queryKey: ['database-stats', activeConnection?.id] });
              }}
            />
            {activeConnection && (
              <div className="mt-4">
                <ConnectionErrorHandler
                  error={error}
                  connectionId={activeConnection.id}
                />
              </div>
            )}
          </div>
        ) : filteredTables.length === 0 ? (
          <NoTablesEmptyState
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
        ) : (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables and columns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredTables.map((table, idx) => (
                <Card
                  key={table.id}
                  className="hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
                  style={{ animation: `fade-in-up 0.4s ease-out ${idx * 0.1}s both` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Table2 className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg">
                            <NavLink to={getTableRoute(table)} className="hover:text-primary">
                              {table.schema}.{table.name}
                            </NavLink>
                          </CardTitle>
                        </div>
                        <CardDescription className="mt-2">
                          {table.columns.length} columns • {table.rowCount.toLocaleString()} rows •{" "}
                          {table.size}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {table.foreignKeys.length > 0 && (
                          <Badge variant="outline">{table.foreignKeys.length} FK</Badge>
                        )}
                        {table.indexes.length > 0 && (
                          <Badge variant="outline">{table.indexes.length} Indexes</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">COLUMNS</div>
                      <div className="grid grid-cols-2 gap-2">
                        {table.columns.slice(0, 8).map((column) => (
                          <div
                            key={column.name}
                            className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
                          >
                            <span className="font-mono font-medium">{column.name}</span>
                            <span className="text-xs text-muted-foreground">{column.type}</span>
                            {column.isPrimaryKey && (
                              <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                                PK
                              </Badge>
                            )}
                            {column.isForeignKey && (
                              <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                                FK
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      {table.columns.length > 8 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          + {table.columns.length - 8} more columns
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {activeConnection && (
        <SchemaDumpDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          connectionId={activeConnection.id}
        />
      )}
    </div>
  );
};

export default SchemaBrowser;
