import { useState, useMemo, useEffect } from "react";
import { Play, Save, Download, Trash2, Code2, History, BookMarked, X, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SQLHighlightedEditor } from "@/components/query/SQLHighlightedEditor";
import { ShortcutTooltip } from "@/components/keyboard";
import { SavedQueries } from "@/components/query/SavedQueries";
import { QueryHistory } from "@/components/query/QueryHistory";
import { ExportDialog } from "@/components/data-viewer/ExportDialog";
import { ParameterForm } from "@/components/query/ParameterForm";
import { parseSQLParameters } from "@/lib/sql/parameterParser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useConnection } from "@/contexts/ConnectionContext";
import { queriesService, queryHistoryService, chartsService } from "@/lib/api";
import type { QueryExecutionResponse, ExplainPlanResponse, ChartOptions, ChartDataResponse } from "@/lib/api/types";
import { NoQueryResultsEmptyState } from "@/components/empty/EmptyState";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { ChartBuilder } from "@/components/charts/ChartBuilder";
import { ChartViewer } from "@/components/charts/ChartViewer";

const QueryBuilder = () => {
  const { activeConnection } = useConnection();
  const queryClient = useQueryClient();
  
  // Load query from localStorage on mount
  const [query, setQuery] = useState(() => {
    const savedQuery = localStorage.getItem('query-builder-query');
    return savedQuery || "";
  });
  const [activeTab, setActiveTab] = useState("results");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryName, setQueryName] = useState("");
  const [queryDescription, setQueryDescription] = useState("");
  const [currentQueryId, setCurrentQueryId] = useState<string | null>(null);
  const [shouldExplain, setShouldExplain] = useState(false);
  
  // Load parameters from localStorage on mount
  const [parameters, setParameters] = useState<Record<string, any>>(() => {
    const savedParams = localStorage.getItem('query-builder-parameters');
    if (savedParams) {
      try {
        return JSON.parse(savedParams);
      } catch {
        return {};
      }
    }
    return {};
  });
  
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [chartOptions, setChartOptions] = useState<ChartOptions | null>(null);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);

  // Save query to localStorage whenever it changes
  useEffect(() => {
    if (query.trim()) {
      localStorage.setItem('query-builder-query', query);
    } else {
      // Remove from localStorage if query is empty
      localStorage.removeItem('query-builder-query');
    }
  }, [query]);

  // Save parameters to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(parameters).length > 0) {
      localStorage.setItem('query-builder-parameters', JSON.stringify(parameters));
    } else {
      // Remove from localStorage if parameters are empty
      localStorage.removeItem('query-builder-parameters');
    }
  }, [parameters]);

  // Query execution mutation
  const executeQueryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      if (!activeConnection) {
        throw new Error("No active connection");
      }
      // Check if query has parameters
      const parsedParams = parseSQLParameters(queryText);
      // Only send parameters if query has parameters AND we have parameter values
      const paramsToSend = parsedParams.hasParameters && Object.keys(parameters).length > 0 
        ? parameters 
        : undefined;
      
      return queriesService.executeQuery(activeConnection.id, {
        query: queryText,
        timeout: 30, // 30 seconds default
        maxRows: 1000, // Max 1000 rows default
        parameters: paramsToSend,
      });
    },
    onSuccess: (response: QueryExecutionResponse) => {
      // Dismiss loading toast
      if (currentQueryId) {
        toast.dismiss(`query-${currentQueryId}`);
        setCurrentQueryId(null);
      }
      
      if (response.success) {
        setActiveTab("results");
        toast.success("Query executed successfully", {
          description: `${response.rowCount || 0} rows returned in ${response.executionTime}ms`,
        });
        // Refresh query history
        queryClient.invalidateQueries({ queryKey: ['query-history', activeConnection?.id] });
      } else {
        toast.error("Query execution failed", {
          description: response.error || "Unknown error",
        });
        setActiveTab("results");
      }
    },
    onError: (error: any) => {
      // Dismiss loading toast
      if (currentQueryId) {
        toast.dismiss(`query-${currentQueryId}`);
        setCurrentQueryId(null);
      }
      
      toast.error("Query execution failed", {
        description: error.message || "Unknown error occurred",
      });
    },
  });

  // Explain plan query
  const explainQueryQuery = useQuery<ExplainPlanResponse>({
    queryKey: ['explain-plan', activeConnection?.id, query, JSON.stringify(parameters)],
    queryFn: async () => {
      if (!activeConnection) {
        throw new Error("No active connection");
      }
      // Check if query has parameters and include them if present
      const parsedParams = parseSQLParameters(query);
      const paramsToSend = parsedParams.hasParameters && Object.keys(parameters).length > 0 
        ? parameters 
        : undefined;
      
      return queriesService.explainQuery(activeConnection.id, {
        query,
        analyze: false,
        parameters: paramsToSend,
      });
    },
    enabled: false, // Only run when explicitly requested
    retry: false,
  });

  // Fetch query history count (lightweight, just for tab badge)
  const {
    data: queryHistory = [],
  } = useQuery({
    queryKey: ['query-history', activeConnection?.id],
    queryFn: async () => {
      if (!activeConnection) {
        return [];
      }
      return queryHistoryService.getQueryHistory(activeConnection.id, 50, 0);
    },
    enabled: !!activeConnection,
    staleTime: 10000, // 10 seconds
    select: (data) => data, // Just use the full data for count
  });

  // Save query mutation
  const saveQueryMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnection) {
        throw new Error("No active connection");
      }
      return queryHistoryService.saveQuery(activeConnection.id, {
        name: queryName,
        query,
        description: queryDescription || undefined,
      });
    },
    onSuccess: () => {
      toast.success(`Query "${queryName}" saved successfully`);
      setSaveDialogOpen(false);
      setQueryName("");
      setQueryDescription("");
      queryClient.invalidateQueries({ queryKey: ['saved-queries', activeConnection?.id] });
    },
    onError: (error: any) => {
      toast.error("Failed to save query", {
        description: error.message || "Unknown error",
      });
    },
  });

  // Clear history mutation
  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnection) {
        throw new Error("No active connection");
      }
      return queryHistoryService.clearHistory(activeConnection.id);
    },
    onSuccess: () => {
      toast.success("Query history cleared");
      queryClient.invalidateQueries({ queryKey: ['query-history', activeConnection?.id] });
    },
    onError: (error: any) => {
      toast.error("Failed to clear history", {
        description: error.message || "Unknown error",
      });
    },
  });

  const handleRun = async () => {
    if (!activeConnection) {
      toast.error("No active connection", {
        description: "Please connect to a database first",
      });
      return;
    }

    if (!query.trim()) {
      toast.error("Query is empty");
      return;
    }

    // Check if query has parameters and validate them
    const parsedParams = parseSQLParameters(query);
    if (parsedParams.hasParameters) {
      const uniqueParamNames = new Set(parsedParams.parameters.map(p => p.name));
      const missingParams: string[] = [];
      
      for (const paramName of uniqueParamNames) {
        if (!parameters[paramName] || parameters[paramName] === '' || parameters[paramName] === null) {
          // Find display name for better error message
          const param = parsedParams.parameters.find(p => p.name === paramName);
          if (param) {
            const displayName = param.name.startsWith('?') 
              ? `Parameter ${param.index}`
              : paramName;
            missingParams.push(displayName);
          }
        }
      }

      if (missingParams.length > 0) {
        toast.error("Missing required parameters", {
          description: `Please provide values for: ${missingParams.join(', ')}`,
          duration: 5000,
        });
        // Scroll to ParameterForm to make it visible
        setTimeout(() => {
          const paramForm = document.querySelector('[data-parameter-form]');
          if (paramForm) {
            paramForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
        return;
      }
    }

    // Generate a query ID for cancellation tracking
    const queryId = `query_${Date.now()}`;
    setCurrentQueryId(queryId);

    // Show loading notification for long operations
    const loadingToast = toast.loading("Executing query...", {
      id: `query-${queryId}`,
    });

    try {
      await executeQueryMutation.mutateAsync(query);
      // Loading toast will be replaced by success/error toast from mutation
    } catch (error) {
      // Error handled in mutation, but dismiss loading toast
      toast.dismiss(`query-${queryId}`);
      setCurrentQueryId(null); // Clear query ID on error
    }
  };

  const handleExplain = async () => {
    if (!activeConnection) {
      toast.error("No active connection");
      return;
    }

    if (!query.trim()) {
      toast.error("Query is empty");
      return;
    }

    setShouldExplain(true);
    setActiveTab("explain");
    explainQueryQuery.refetch();
  };

  const handleSave = () => {
    if (!queryName.trim()) {
      toast.error("Please enter a query name");
      return;
    }

    if (!query.trim()) {
      toast.error("Query is empty");
      return;
    }

    saveQueryMutation.mutate();
  };

  const handleClearHistory = () => {
    clearHistoryMutation.mutate();
  };

  const handleCancelQuery = async () => {
    if (!currentQueryId || !activeConnection) {
      return;
    }

    try {
      await queriesService.cancelQuery(activeConnection.id, currentQueryId);
      toast.info("Query cancellation requested");
      setCurrentQueryId(null);
    } catch (error: any) {
      toast.error("Failed to cancel query", {
        description: error.message || "Unknown error",
      });
    }
  };

  const handleGenerateChart = async (options: ChartOptions) => {
    if (!activeConnection || !resultData || resultData.length === 0) {
      toast.error("No query results available", {
        description: "Execute a query first to generate charts",
      });
      return;
    }

    setIsGeneratingChart(true);
    setChartOptions(options);

    try {
      const chartResponse = await chartsService.getQueryChartData(
        activeConnection.id,
        resultData,
        options,
      );
      setChartData(chartResponse);
      setActiveTab("charts");
      toast.success("Chart generated successfully");
    } catch (error: any) {
      toast.error("Failed to generate chart", {
        description: error.message || "Unknown error occurred",
      });
    } finally {
      setIsGeneratingChart(false);
    }
  };

  // Get query execution result
  const queryResult = executeQueryMutation.data;
  const isRunning = executeQueryMutation.isPending;
  const queryError = executeQueryMutation.error;
  const executionTime = queryResult?.executionTime || 0;
  const rowCount = queryResult?.rowCount || queryResult?.rowsAffected || 0;

  // Get query result data
  const resultData = queryResult?.success ? queryResult.data || [] : [];
  const resultColumns = queryResult?.columns || [];

  // Check if there's a running query to show cancel button
  const canCancel = isRunning && currentQueryId;

  // Keyboard shortcuts for Query Builder
  useKeyboardShortcut(
    'Enter',
    () => {
      if (query.trim() && activeConnection && !isRunning) {
        handleRun();
      }
    },
    { ctrl: true },
    { enabled: !saveDialogOpen }
  );

  useKeyboardShortcut(
    'F5',
    () => {
      if (query.trim() && activeConnection && !isRunning) {
        handleRun();
      }
    },
    {},
    { enabled: !saveDialogOpen }
  );

  useKeyboardShortcut(
    's',
    () => {
      if (query.trim() && !saveDialogOpen) {
        setSaveDialogOpen(true);
      } else if (saveDialogOpen && queryName.trim()) {
        handleSave();
      }
    },
    { ctrl: true },
    { preventDefault: true }
  );

  useKeyboardShortcut(
    'l',
    () => {
      if (!saveDialogOpen) {
        setQuery('');
      }
    },
    { ctrl: true },
    { enabled: !saveDialogOpen }
  );

  return (
    <div className="flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Query Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Execute SQL queries and analyze results
            </p>
          </div>
          <div className="flex gap-2">
            <SavedQueries connectionId={activeConnection?.id || null} onLoadQuery={setQuery} />
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <ShortcutTooltip shortcut="Ctrl+S" description="Save query">
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Query
                  </Button>
                </DialogTrigger>
              </ShortcutTooltip>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Query</DialogTitle>
                  <DialogDescription>
                    Give your query a name to save it for later use
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="query-name">Query Name *</Label>
                    <Input
                      id="query-name"
                      placeholder="My useful query"
                      value={queryName}
                      onChange={(e) => setQueryName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="query-description">Description (Optional)</Label>
                    <Textarea
                      id="query-description"
                      placeholder="Describe what this query does..."
                      value={queryDescription}
                      onChange={(e) => setQueryDescription(e.target.value)}
                      className="mt-1.5"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save</Button>
                </div>
              </DialogContent>
            </Dialog>
            {activeConnection && query.trim() && (
              <ExportDialog
                connectionId={activeConnection.id}
                query={query}
              />
            )}
            <ShortcutTooltip shortcut="Ctrl+L" description="Clear query">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setQuery("")}
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </Button>
            </ShortcutTooltip>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="border-b border-border">
          <div className="p-6 pb-6">
            <div className="flex gap-2 mb-2">
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={handleCancelQuery}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel Query
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleExplain}
                disabled={!activeConnection || !query.trim() || explainQueryQuery.isFetching}
                className="gap-2"
              >
                {explainQueryQuery.isFetching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4" />
                    Explain Plan
                  </>
                )}
              </Button>
            </div>
            <div className="space-y-4">
              <div className="h-[500px] overflow-y-auto border rounded-md">
                <SQLHighlightedEditor
                  value={query}
                  onChange={(newQuery) => {
                    setQuery(newQuery);
                    // Reset parameters when query changes significantly
                    const parsedParams = parseSQLParameters(newQuery);
                    if (!parsedParams.hasParameters) {
                      setParameters({});
                    }
                  }}
                  onExecute={handleRun}
                  isExecuting={isRunning}
                />
              </div>
              <ParameterForm
                query={query}
                parameters={parameters}
                onParametersChange={setParameters}
                isExecuting={isRunning}
              />
            </div>
          </div>
        </div>

        <div className="border-b border-border h-[500px] flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="border-b border-border px-6 flex-shrink-0">
              <TabsList>
                <TabsTrigger value="results" className="gap-2">
                  <Play className="w-3 h-3" />
                  Results
                </TabsTrigger>
                {resultData.length > 0 && (
                  <TabsTrigger value="charts" className="gap-2">
                    <BarChart3 className="w-3 h-3" />
                    Charts
                  </TabsTrigger>
                )}
                <TabsTrigger value="explain" className="gap-2">
                  <Code2 className="w-3 h-3" />
                  Explain Plan
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-3 h-3" />
                  History ({queryHistory.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <TabsContent value="results" className="mt-0 p-6">
                {!activeConnection ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <p>No active connection</p>
                      <p className="text-sm mt-1">Please connect to a database first</p>
                    </CardContent>
                  </Card>
                ) : isRunning ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                      <p className="text-muted-foreground">Executing query...</p>
                    </CardContent>
                  </Card>
                ) : queryError ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-destructive">Query Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-sm bg-destructive/10 text-destructive p-4 rounded">
                        {queryError instanceof Error ? queryError.message : String(queryError)}
                      </div>
                    </CardContent>
                  </Card>
                ) : queryResult && !queryResult.success ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-destructive">Query Failed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-sm bg-destructive/10 text-destructive p-4 rounded">
                        {queryResult.error || "Unknown error occurred"}
                      </div>
                    </CardContent>
                  </Card>
                ) : resultData.length === 0 && queryResult && queryResult.success ? (
                  <NoQueryResultsEmptyState />
                ) : resultData.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Query Results</CardTitle>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{rowCount} rows</Badge>
                          {executionTime > 0 && (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                              Executed in {executionTime}ms
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-table-header hover:bg-table-header">
                              {resultColumns.length > 0 ? (
                                resultColumns.map((col) => (
                                  <TableHead key={col} className="font-semibold">
                                    {col}
                                  </TableHead>
                                ))
                              ) : resultData.length > 0 ? (
                                Object.keys(resultData[0]).map((key) => (
                                  <TableHead key={key} className="font-semibold">
                                    {key}
                                  </TableHead>
                                ))
                              ) : null}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resultData.map((row, idx) => (
                              <TableRow key={idx} className="hover:bg-table-row-hover">
                                {resultColumns.length > 0 ? (
                                  resultColumns.map((col) => (
                                    <TableCell key={col} className="font-mono text-sm">
                                      {row[col] !== null && row[col] !== undefined
                                        ? String(row[col])
                                        : "NULL"}
                                    </TableCell>
                                  ))
                                ) : (
                                  Object.entries(row).map(([key, value]) => (
                                    <TableCell key={key} className="font-mono text-sm">
                                      {value !== null && value !== undefined
                                        ? String(value)
                                        : "NULL"}
                                    </TableCell>
                                  ))
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Play className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No query executed yet</p>
                      <p className="text-sm mt-1">Run a query to see results here</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {resultData.length > 0 && (
                <TabsContent value="charts" className="mt-0 p-6 space-y-4">
                  {!activeConnection ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <p>No active connection</p>
                        <p className="text-sm mt-1">Please connect to a database first</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <ChartBuilder
                        columns={resultColumns.map((name) => ({
                          name,
                          type: 'unknown', // Column type not available from query results
                          nullable: true,
                          isPrimaryKey: false,
                          isForeignKey: false,
                        }))}
                        availableColumns={resultColumns.length > 0 ? resultColumns : Object.keys(resultData[0] || {})}
                        onGenerateChart={handleGenerateChart}
                        isLoading={isGeneratingChart}
                      />
                      {chartData && (
                        <ChartViewer chartData={chartData} height={400} />
                      )}
                    </>
                  )}
                </TabsContent>
              )}

              <TabsContent value="explain" className="mt-0 p-6">
                {!activeConnection ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <p>No active connection</p>
                      <p className="text-sm mt-1">Please connect to a database first</p>
                    </CardContent>
                  </Card>
                ) : !query.trim() ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Code2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No query entered</p>
                      <p className="text-sm mt-1">Enter a query and click "Explain" to see the execution plan</p>
                    </CardContent>
                  </Card>
                ) : explainQueryQuery.isFetching ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                      <p className="text-muted-foreground">Analyzing query plan...</p>
                    </CardContent>
                  </Card>
                ) : explainQueryQuery.error ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm text-destructive">Explain Plan Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-sm bg-destructive/10 text-destructive p-4 rounded">
                        {explainQueryQuery.error instanceof Error
                          ? explainQueryQuery.error.message
                          : String(explainQueryQuery.error)}
                      </div>
                    </CardContent>
                  </Card>
                ) : explainQueryQuery.data ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Query Execution Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="font-mono text-sm bg-code-bg p-4 rounded whitespace-pre-wrap">
                        {explainQueryQuery.data.formattedPlan || explainQueryQuery.data.plan}
                      </div>
                      {(explainQueryQuery.data.executionTime || explainQueryQuery.data.planningTime) && (
                        <div className="mt-4 text-sm text-muted-foreground">
                          {explainQueryQuery.data.planningTime && (
                            <p>Planning time: {explainQueryQuery.data.planningTime}ms</p>
                          )}
                          {explainQueryQuery.data.executionTime && (
                            <p>Execution time: {explainQueryQuery.data.executionTime}ms</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <Code2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No execution plan yet</p>
                      <p className="text-sm mt-1">Click "Explain" to analyze the query plan</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0 p-6">
                {!activeConnection ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No active connection</p>
                    <p className="text-sm mt-1">Please connect to a database first</p>
                  </div>
                ) : (
                  <QueryHistory
                    connectionId={activeConnection.id}
                    onLoadQuery={setQuery}
                    onClearHistory={handleClearHistory}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default QueryBuilder;
