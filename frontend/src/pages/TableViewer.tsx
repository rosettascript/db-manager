import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect, useRef, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table2, Download, Filter, RefreshCcw, Key, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Search, Copy, Check, Loader2, AlertCircle, Trash2, Edit, Plus, X, Maximize2 } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebounce } from "@/hooks/useDebounce";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import { dataService } from "@/lib/api/services/data.service";
import { chartsService } from "@/lib/api/services/charts.service";
import { schemaDumpService } from "@/lib/api/services/schema-dump.service";
import type { Table as TableType, FilterRule, ChartOptions, ChartDataResponse } from "@/lib/api/types";
import { ChartBuilder } from "@/components/charts/ChartBuilder";
import { ChartViewer } from "@/components/charts/ChartViewer";
import { BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataFilters } from "@/components/data-viewer/DataFilters";
import { ExportDialog } from "@/components/data-viewer/ExportDialog";
import { ColumnManager } from "@/components/data-viewer/ColumnManager";
import { TableBreadcrumb } from "@/components/table-viewer/TableBreadcrumb";
import { RelationshipCard } from "@/components/table-viewer/RelationshipCard";
import { ForeignKeyCell } from "@/components/table-viewer/ForeignKeyCell";
import { DeleteConfirmationDialog } from "@/components/table-viewer/DeleteConfirmationDialog";
import { BulkUpdateDialog } from "@/components/table-viewer/BulkUpdateDialog";
import { BulkActionsToolbar } from "@/components/table-viewer/BulkActionsToolbar";
import { BulkExportDialog } from "@/components/table-viewer/BulkExportDialog";
import { EditableCell } from "@/components/table-viewer/EditableCell";
import { AddRowDialog } from "@/components/table-viewer/AddRowDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShortcutTooltip } from "@/components/keyboard";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { ConnectionErrorHandler } from "@/components/error/ConnectionErrorHandler";
import { TableSkeleton } from "@/components/loading/LoadingSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TableViewer = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConnection } = useConnection();
  const queryClient = useQueryClient();


  // Parse tableId to extract schema and table name
  // Format: "schema.tableName"
  const parsedTable = useMemo(() => {
    if (!tableId || typeof tableId !== 'string') {
      return null;
    }
    try {
      const parts = tableId.split('.');
      if (!parts || parts.length < 2) {
        return null;
      }
      const schema = parts[0]?.trim();
      const tableNameParts = parts.slice(1);
      if (!schema || tableNameParts.length === 0) {
        return null;
      }
      const tableName = tableNameParts.join('.').trim();
      if (!tableName) {
        return null;
      }
      const parsed = { schema, tableName, fullId: tableId };
      return parsed;
    } catch (error) {
      return null;
    }
  }, [tableId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState("100");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [renderTime, setRenderTime] = useState<number>(0);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<Array<{ id: string; name: string; schema: string }>>([]);
  const [activeTab, setActiveTab] = useState<string>("data");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  // Row editing state
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnName: string } | null>(null);
  const [isSavingCell, setIsSavingCell] = useState(false);
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  
  // Chart state
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [chartOptions, setChartOptions] = useState<ChartOptions | null>(null);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fullscreenTableRef = useRef<HTMLDivElement>(null);

  // Debounce search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Track previous tableId to detect changes
  const prevTableIdRef = useRef<string | null>(null);
  const prevPathnameRef = useRef<string | null>(null);
  
  // Track if we're transitioning between tables (for immediate ghost loading)
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Reset state and invalidate queries when tableId or pathname changes
  useEffect(() => {
    const pathnameChanged = prevPathnameRef.current !== location.pathname;
    const tableIdChanged = tableId && prevTableIdRef.current !== tableId;
    
    if (tableIdChanged || pathnameChanged) {
      const prevTableId = prevTableIdRef.current;
      prevTableIdRef.current = tableId || null;
      prevPathnameRef.current = location.pathname;
      
      // Immediately set transitioning state for instant ghost loading
      setIsTransitioning(true);
      
      // Reset all state when navigating to a different table
      setSearchQuery("");
      setCurrentPage(1);
      setSortColumn(null);
      setSortDirection("asc");
      setFilters([]);
      setActiveTab("data");
      setSelectedRows(new Set());
      setEditMode(false);
      setEditingCell(null);
      setChartData(null);
      setChartOptions(null);
      
      // Only invalidate if we have connection and parsed table
      // Don't aggressively remove queries - let React Query cache handle it for smooth transitions
      if (activeConnection && parsedTable) {
        // Invalidate queries for the new table to force fresh fetch
        // But keep previous data visible while fetching (handled by placeholderData)
        queryClient.invalidateQueries({
          queryKey: ['table-details', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
        queryClient.invalidateQueries({
          queryKey: ['table-data', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, location.pathname]); // Only depend on tableId and pathname to avoid infinite loops

  // Track previous table to show while loading new one
  const [previousTable, setPreviousTable] = useState<TableType | null>(null);
  
  // Fetch table details
  const {
    data: table,
    isLoading: tableLoading,
    isError: tableError,
    error: tableErrorDetails,
    isFetching: tableFetching,
  } = useQuery<TableType>({
    queryKey: ['table-details', activeConnection?.id, parsedTable?.schema, parsedTable?.tableName],
    queryFn: () => schemasService.getTableDetails(
      activeConnection!.id,
      parsedTable!.schema,
      parsedTable!.tableName,
    ),
    enabled: !!activeConnection && activeConnection.status === 'connected' && !!parsedTable,
    staleTime: 300000, // Consider fresh for 5 minutes
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: 'always', // Always refetch when component mounts with new table
    refetchOnWindowFocus: false, // Don't refetch on focus
    placeholderData: (previousData) => previousData, // Keep previous data visible while fetching
  });
  
  // Update previous table when we have a new one
  useEffect(() => {
    if (table && !tableLoading) {
      setPreviousTable(table);
    }
  }, [table, tableLoading]);
  
  // Use previous table if current is loading (for smooth transitions)
  const displayTable = table || previousTable;

  // Fetch table DDL
  const {
    data: tableDDL,
    isLoading: ddlLoading,
    isError: ddlError,
    error: ddlErrorDetails,
  } = useQuery({
    queryKey: [
      'table-ddl',
      activeConnection?.id,
      parsedTable?.schema,
      parsedTable?.tableName,
    ],
    queryFn: () => schemaDumpService.getTableDDL(
      activeConnection!.id,
      parsedTable!.schema,
      parsedTable!.tableName,
      { includeDrops: false },
    ),
    enabled: !!activeConnection && activeConnection.status === 'connected' && !!parsedTable,
    staleTime: 300000, // Consider fresh for 5 minutes
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Fetch table data
  const {
    data: tableDataResponse,
    isLoading: dataLoading,
    isError: dataError,
    error: dataErrorDetails,
    refetch: refetchData,
    isFetching: dataFetching,
  } = useQuery({
    queryKey: [
      'table-data',
      activeConnection?.id,
      parsedTable?.schema,
      parsedTable?.tableName,
      currentPage,
      parseInt(pageSize),
      debouncedSearchQuery,
      sortColumn,
      sortDirection,
      (() => {
      // Normalize visibleColumns - use sorted array for consistent key
      // Use cached table if current table is not available
      const cachedTable = queryClient.getQueryData<TableType>([
        'table-details',
        activeConnection?.id,
        parsedTable?.schema,
        parsedTable?.tableName,
      ]);
      const tableToUse = table || cachedTable;
      const normalized = visibleColumns.length > 0 ? [...visibleColumns].sort() : (tableToUse?.columns.map(c => c.name).sort() || []);
        return normalized;
      })(),
      filters,
    ],
    queryFn: () => {
      // Get table from cache if current state doesn't have it
      const cachedTable = queryClient.getQueryData<TableType>([
        'table-details',
        activeConnection?.id,
        parsedTable?.schema,
        parsedTable?.tableName,
      ]);
      const tableToUse = table || cachedTable;
      
      // Filter visibleColumns to only include columns that exist in the current table
      // Use all table columns as fallback if visibleColumns is empty
      const validColumns = tableToUse && visibleColumns.length > 0
        ? visibleColumns.filter(col => tableToUse.columns.some(tc => tc.name === col))
        : (tableToUse ? tableToUse.columns.map(c => c.name) : undefined);
      
      return dataService.getTableData(
        activeConnection!.id,
        parsedTable!.schema,
        parsedTable!.tableName,
        {
          page: currentPage,
          pageSize: parseInt(pageSize),
          search: debouncedSearchQuery || undefined,
          sortColumn: sortColumn || undefined,
          sortDirection: sortDirection || undefined,
          columns: validColumns && validColumns.length > 0 ? validColumns : undefined,
          filters: filters.length > 0 ? filters : undefined,
        },
      );
    },
    enabled: (() => {
      // Check for table in current state OR in cache
      const cachedTable = queryClient.getQueryData<TableType>([
        'table-details',
        activeConnection?.id,
        parsedTable?.schema,
        parsedTable?.tableName,
      ]);
      const tableToUse = table || cachedTable;
      const enabled = !!activeConnection && activeConnection.status === 'connected' && !!parsedTable && !!tableToUse && tableToUse.columns.length > 0;
      return enabled;
    })(),
    staleTime: 300000, // Consider fresh for 5 minutes - prevents refetch on tab switch
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: 'always', // Always refetch when component mounts with new table
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    placeholderData: (previousData) => previousData, // Keep previous data visible while fetching
  });

  // Manually read from cache if tableDataResponse is undefined (during loading/unmount)
  const cachedTableData = useMemo(() => {
    if (tableDataResponse) return tableDataResponse;
    
    // Try to get from cache when response is undefined
    const cacheKey = [
      'table-data',
      activeConnection?.id,
      parsedTable?.schema,
      parsedTable?.tableName,
      currentPage,
      parseInt(pageSize),
      debouncedSearchQuery,
      sortColumn,
      sortDirection,
      (() => {
        const cachedTable = queryClient.getQueryData<TableType>([
          'table-details',
          activeConnection?.id,
          parsedTable?.schema,
          parsedTable?.tableName,
        ]);
        const tableToUse = table || cachedTable;
        return visibleColumns.length > 0 ? [...visibleColumns].sort() : (tableToUse?.columns.map(c => c.name).sort() || []);
      })(),
      filters,
    ];
    
    const cached = queryClient.getQueryData<typeof tableDataResponse>(cacheKey);
    return cached || null;
  }, [tableDataResponse, activeConnection?.id, parsedTable?.schema, parsedTable?.tableName, currentPage, pageSize, debouncedSearchQuery, sortColumn, sortDirection, visibleColumns, filters, queryClient, table, activeTab, dataLoading]);
  
  // Persist last successful data in state to survive tab switches/unmounts
  const [persistedTableData, setPersistedTableData] = useState<typeof tableDataResponse>(null);
  const [persistedPagination, setPersistedPagination] = useState<typeof pagination>(undefined);
  
  // Update persisted data when we get successful responses
  useEffect(() => {
    if (tableDataResponse && !dataLoading && !dataError) {
      setPersistedTableData(tableDataResponse);
      setPersistedPagination(tableDataResponse.pagination);
    }
  }, [tableDataResponse, dataLoading, dataError]);
  
  // Use persisted data if current response is unavailable
  const effectiveResponse = tableDataResponse || cachedTableData || persistedTableData;
  const tableData = effectiveResponse?.data || [];
  const pagination = effectiveResponse?.pagination || persistedPagination;
  // Only show loading if we don't have any data to display
  const isLoading = (tableLoading && !previousTable) || (dataLoading && !persistedTableData && !cachedTableData);
  const isError = tableError || dataError;
  const isFetching = tableFetching || dataFetching;
  
  // Clear transitioning state when new table data is loaded
  useEffect(() => {
    // Clear transitioning when we have table details loaded (even if no rows)
    // This allows empty tables to display properly
    if (table && !tableLoading && !dataLoading) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 100);
      return () => clearTimeout(timer);
    }
    
    // Fallback: Clear transitioning after 5 seconds to prevent stuck state
    if (isTransitioning) {
      const fallbackTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, 5000);
      return () => clearTimeout(fallbackTimer);
    }
  }, [table, tableLoading, dataLoading, isTransitioning]);


  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, filters, sortColumn, sortDirection]);

  // Initialize visible columns and widths when table changes
  // Must be called before any early returns to maintain hook order
  // Track the current table ID to detect table changes
  const currentTableIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (table && table.columns.length > 0) {
      const tableId = table.id || `${table.schema}.${table.name}`;
      
      // Always reset visibleColumns when table changes
      if (currentTableIdRef.current !== tableId) {
        currentTableIdRef.current = tableId;
        const columnNames = table.columns.map(c => c.name);
        setVisibleColumns(columnNames);
        
        const initialWidths: Record<string, number> = {};
        table.columns.forEach(col => {
          initialWidths[col.name] = 150; // Default width
        });
        setColumnWidths(initialWidths);
      } else if (visibleColumns.length === 0) {
        // Initialize if empty
        const columnNames = table.columns.map(c => c.name);
        setVisibleColumns(columnNames);
        
        const initialWidths: Record<string, number> = {};
        table.columns.forEach(col => {
          initialWidths[col.name] = 150;
        });
        setColumnWidths(initialWidths);
      } else {
        // Validate visibleColumns against current table columns
        // Filter out any columns that don't exist in the current table
        const validColumns = visibleColumns.filter(colName => 
          table.columns.some(col => col.name === colName)
        );
        if (validColumns.length !== visibleColumns.length || validColumns.length === 0) {
          // Some columns are invalid or empty, reset to all table columns
          const columnNames = table.columns.map(c => c.name);
          setVisibleColumns(columnNames);
        }
      }
    }
  }, [table?.id, table?.schema, table?.name, visibleColumns.length]);

  // Initialize breadcrumb trail with persistence
  useEffect(() => {
    if (table) {
      setBreadcrumbTrail(prev => {
        // Check if this table already exists in trail
        const existingIndex = prev.findIndex(item => item.id === table.id);
        
        if (existingIndex !== -1) {
          // If exists, slice trail up to that point (handles back navigation)
          return prev.slice(0, existingIndex + 1);
        }
        
        // Add new table to trail
        const newTrail = [...prev, { id: table.id, name: table.name, schema: table.schema }];
        
        // Limit trail to 10 items to prevent memory issues
        if (newTrail.length > 10) {
          return newTrail.slice(-10);
        }
        
        // Persist to sessionStorage
        sessionStorage.setItem('tableNavigationTrail', JSON.stringify(newTrail));
        
        return newTrail;
      });
    }
  }, [table]);

  // Load trail from sessionStorage on mount
  useEffect(() => {
    const savedTrail = sessionStorage.getItem('tableNavigationTrail');
    if (savedTrail) {
      try {
        const parsed = JSON.parse(savedTrail);
        setBreadcrumbTrail(parsed);
      } catch (e) {
        // Silently handle parse errors
      }
    }
  }, []);

  const handleBreadcrumbNavigate = useCallback((targetTableId: string) => {
    const targetIndex = breadcrumbTrail.findIndex(item => item.id === targetTableId);
    if (targetIndex !== -1) {
      const newTrail = breadcrumbTrail.slice(0, targetIndex + 1);
      setBreadcrumbTrail(newTrail);
      sessionStorage.setItem('tableNavigationTrail', JSON.stringify(newTrail));
    }
    
    // Reset state for new table navigation
    setSearchQuery("");
    setCurrentPage(1);
    setSortColumn(null);
    setSortDirection("asc");
    setFilters([]);
    setActiveTab("data");
    setPersistedTableData(null);
    setPersistedPagination(undefined);
    setVisibleColumns([]);
    
    // Parse the target table ID to invalidate the correct queries
    const parts = targetTableId.split('.');
    if (parts.length >= 2) {
      const targetSchema = parts[0];
      const targetTableName = parts.slice(1).join('.');
      
      // Remove queries from cache and invalidate to force fresh fetch
      queryClient.removeQueries({
        queryKey: ['table-details', activeConnection?.id, targetSchema, targetTableName],
      });
      queryClient.removeQueries({
        queryKey: ['table-data', activeConnection?.id, targetSchema, targetTableName],
      });
    }
    
    // Navigate to the new table
    navigate(`/table/${targetTableId}`);
  }, [breadcrumbTrail, navigate, activeConnection?.id, queryClient]);

  // Data is already filtered, sorted, and paginated by the API
  const paginatedData = tableData;
  const totalPages = pagination?.totalPages || 0;
  const pageSizeNum = parseInt(pageSize);

  // Track render performance
  useEffect(() => {
    const start = performance.now();
    return () => {
      const end = performance.now();
      setRenderTime(Math.round(end - start));
    };
  }, [paginatedData]);

  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn, sortDirection]);

  const handleCopyCell = useCallback(async (value: any, cellId: string) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedCell(cellId);
      setTimeout(() => setCopiedCell(null), 2000);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy");
    }
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ['table-data', activeConnection?.id, parsedTable?.schema, parsedTable?.tableName],
    });
    queryClient.invalidateQueries({
      queryKey: ['table-details', activeConnection?.id, parsedTable?.schema, parsedTable?.tableName],
    });
    toast.success("Data refreshed");
  }, [queryClient, activeConnection?.id, parsedTable?.schema, parsedTable?.tableName]);

  const handleToggleColumn = (columnName: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnName)
        ? prev.filter(c => c !== columnName)
        : [...prev, columnName]
    );
  };

  const handleToggleAllColumns = (visible: boolean) => {
    if (table) {
      setVisibleColumns(visible ? table.columns.map(c => c.name) : []);
    }
  };

  const filteredColumns = useMemo(
    () => {
      const tableToUse = displayTable || table;
      if (!tableToUse) return [];
      if (visibleColumns.length === 0) return tableToUse.columns;
      return tableToUse.columns.filter(col => visibleColumns.includes(col.name));
    },
    [displayTable, table, visibleColumns]
  );

  const handleCopyRow = useCallback(async (row: any) => {
    try {
      const text = filteredColumns.map(col => row[col.name]).join('\t');
      await navigator.clipboard.writeText(text);
      toast.success("Row copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy row");
    }
  }, [filteredColumns]);

  // Row selection functions
  const getRowId = useCallback((row: any, index: number): string => {
    // Try to use primary key columns if available
    if (table?.columns) {
      const primaryKeyColumns = table.columns.filter(col => col.isPrimaryKey);
      if (primaryKeyColumns.length > 0) {
        const keyValues = primaryKeyColumns.map(col => String(row[col.name] ?? ''));
        if (keyValues.every(v => v !== '')) {
          return keyValues.join('|');
        }
      }
    }
    // Fallback to row index
    return `row-${index}`;
  }, [table]);

  const handleToggleRowSelection = useCallback((rowId: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!paginatedData || paginatedData.length === 0) return;
    
    const allRowIds = paginatedData.map((row, idx) => getRowId(row, idx));
    const allSelected = allRowIds.every(id => selectedRows.has(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        allRowIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all visible rows
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        allRowIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [paginatedData, selectedRows, getRowId]);

  const handleDeleteClick = useCallback(() => {
    if (selectedRows.size === 0) {
      toast.info("No rows selected");
      return;
    }

    if (!activeConnection || !parsedTable) {
      toast.error("No connection or table selected");
      return;
    }

    // Open confirmation dialog
    setDeleteDialogOpen(true);
  }, [selectedRows, activeConnection, parsedTable]);

  const handleConfirmDelete = useCallback(async () => {
    if (!activeConnection || !parsedTable || selectedRows.size === 0) {
      return;
    }

    setIsDeleting(true);

    try {
      const rowIdsArray = Array.from(selectedRows);
      
      // Use batch delete API
      const response = await dataService.deleteRows(
        activeConnection.id,
        parsedTable.schema,
        parsedTable.tableName,
        rowIdsArray
      );

      if (response.success) {
        toast.success(`Successfully deleted ${response.deletedCount} row(s)`);
        
        // Clear selection
        setSelectedRows(new Set());
        
        // Close dialog
        setDeleteDialogOpen(false);
        
        // Invalidate and refetch table data
        queryClient.invalidateQueries({
          queryKey: ['table-data', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
        
        // Also invalidate count
        queryClient.invalidateQueries({
          queryKey: ['table-count', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
      } else {
        toast.error(response.message || 'Failed to delete rows');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete rows');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedRows, activeConnection, parsedTable, queryClient]);

  // Handle bulk update
  const handleBulkUpdate = useCallback(async (updates: Array<{ column: string; value: string }>) => {
    if (!activeConnection || !parsedTable || selectedRows.size === 0) {
      return;
    }

    setIsUpdating(true);

    try {
      const rowIdsArray = Array.from(selectedRows);
      
      const response = await dataService.updateRows(
        activeConnection.id,
        parsedTable.schema,
        parsedTable.tableName,
        {
          rowIds: rowIdsArray,
          updates: updates,
        }
      );

      if (response.success) {
        toast.success(`Successfully updated ${response.updatedCount} row(s)`);
        
        if (response.errors && response.errors.length > 0) {
          toast.warning(`${response.errors.length} row(s) failed to update`);
        }
        
        // Clear selection
        setSelectedRows(new Set());
        
        // Close dialog
        setUpdateDialogOpen(false);
        
        // Invalidate and refetch table data
        queryClient.invalidateQueries({
          queryKey: ['table-data', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
        
        // Also invalidate count
        queryClient.invalidateQueries({
          queryKey: ['table-count', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
      } else {
        toast.error(response.message || 'Failed to update rows');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rows');
    } finally {
      setIsUpdating(false);
    }
  }, [selectedRows, activeConnection, parsedTable, queryClient]);

  // Handle bulk export
  const handleBulkExport = useCallback(() => {
    if (selectedRows.size === 0) {
      toast.error("No rows selected for export");
      return;
    }
    setExportDialogOpen(true);
  }, [selectedRows]);

  // Get selected rows data
  const selectedRowsData = useMemo(() => {
    if (!paginatedData || selectedRows.size === 0) return [];
    
    return paginatedData.filter((row, idx) => {
      const rowId = getRowId(row, idx);
      return selectedRows.has(rowId);
    });
  }, [paginatedData, selectedRows, getRowId]);

  // Handle start editing a cell
  const handleStartEditCell = useCallback((rowId: string, columnName: string) => {
    if (!editMode) return;
    setEditingCell({ rowId, columnName });
  }, [editMode]);

  // Handle cancel editing
  const handleCancelEditCell = useCallback(() => {
    setEditingCell(null);
  }, []);

  // Handle save cell edit
  const handleSaveCellEdit = useCallback(async (rowId: string, columnName: string, newValue: any) => {
    if (!activeConnection || !parsedTable || !table) {
      toast.error("Missing connection or table information");
      return;
    }

    setIsSavingCell(true);

    try {
      // Find the row data to get the primary key
      const rowIndex = paginatedData?.findIndex((row, idx) => {
        const id = getRowId(row, idx);
        return id === rowId;
      });

      if (rowIndex === undefined || rowIndex === -1) {
        toast.error("Row not found");
        return;
      }

      const row = paginatedData![rowIndex];
      
      // Get primary key columns
      const primaryKeyColumns = table.columns.filter(col => col.isPrimaryKey);
      if (primaryKeyColumns.length === 0) {
        toast.error("Table has no primary key");
        return;
      }

      // Build row ID from primary key values
      const primaryKeyValues = primaryKeyColumns.map(col => row[col.name]);
      const rowIdValue = primaryKeyColumns.length === 1 
        ? String(primaryKeyValues[0])
        : primaryKeyValues.join('|');

      // Prepare update data
      const updateData: Record<string, any> = {
        [columnName]: newValue,
      };

      // Call update API
      const response = await dataService.updateRow(
        activeConnection.id,
        parsedTable.schema,
        parsedTable.tableName,
        rowIdValue,
        updateData,
      );

      if (response.success && response.row) {
        toast.success(`Updated ${columnName}`);
        
        // Close editing
        setEditingCell(null);
        
        // Invalidate and refetch table data
        queryClient.invalidateQueries({
          queryKey: ['table-data', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
        queryClient.invalidateQueries({
          queryKey: ['table-count', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
      } else {
        toast.error(response.message || 'Failed to update cell');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update cell');
    } finally {
      setIsSavingCell(false);
    }
  }, [activeConnection, parsedTable, table, paginatedData, getRowId, queryClient]);

  // Handle add new row
  const handleAddRow = useCallback(async (data: Record<string, any>) => {
    if (!activeConnection || !parsedTable) {
      toast.error("Missing connection or table information");
      return;
    }

    setIsInserting(true);

    try {
      const response = await dataService.insertRow(
        activeConnection.id,
        parsedTable.schema,
        parsedTable.tableName,
        data,
      );

      if (response.success) {
        toast.success("Row inserted successfully");
        
        // Close dialog
        setAddRowDialogOpen(false);
        
        // Invalidate and refetch table data
        queryClient.invalidateQueries({
          queryKey: ['table-data', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
        queryClient.invalidateQueries({
          queryKey: ['table-count', activeConnection.id, parsedTable.schema, parsedTable.tableName],
        });
      } else {
        toast.error(response.message || 'Failed to insert row');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to insert row');
    } finally {
      setIsInserting(false);
    }
  }, [activeConnection, parsedTable, queryClient]);

  // Clear selection when table changes
  useEffect(() => {
    setSelectedRows(new Set());
  }, [table?.id]);

  // Compute select all state
  const isAllSelected = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return false;
    const allRowIds = paginatedData.map((row, idx) => getRowId(row, idx));
    return allRowIds.length > 0 && allRowIds.every(id => selectedRows.has(id));
  }, [paginatedData, selectedRows, getRowId]);

  const isSomeSelected = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return false;
    const allRowIds = paginatedData.map((row, idx) => getRowId(row, idx));
    return allRowIds.some(id => selectedRows.has(id));
  }, [paginatedData, selectedRows, getRowId]);

  // Keyboard shortcuts for Table Viewer
  useKeyboardShortcut(
    'f',
    () => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    },
    { ctrl: true },
    { enabled: activeTab === 'data' }
  );

  useKeyboardShortcut(
    'r',
    () => {
      if (!isLoading && table) {
        handleRefresh();
      }
    },
    { ctrl: true },
    { enabled: !!table }
  );

  // Select all rows with Ctrl+A
  useKeyboardShortcut(
    'a',
    () => {
      if (activeTab === 'data' && paginatedData && paginatedData.length > 0) {
        handleSelectAll();
      }
    },
    { ctrl: true },
    { enabled: activeTab === 'data' && !!paginatedData && paginatedData.length > 0 }
  );

  // Delete selected rows with Delete key
  useKeyboardShortcut(
    'Delete',
    () => {
      if (activeTab === 'data' && selectedRows.size > 0) {
        handleDeleteClick();
      }
    },
    {},
    { enabled: activeTab === 'data' && selectedRows.size > 0 }
  );

  // Cancel selection with Esc key
  useKeyboardShortcut(
    'Escape',
    () => {
      if (activeTab === 'data' && selectedRows.size > 0) {
        setSelectedRows(new Set());
      }
    },
    {},
    { enabled: activeTab === 'data' && selectedRows.size > 0 }
  );

  // Toggle edit mode with Ctrl+E
  useKeyboardShortcut(
    'e',
    () => {
      if (activeTab === 'data' && table) {
        setEditMode(prev => !prev);
        if (editMode) {
          setEditingCell(null); // Clear any active editing when exiting edit mode
        }
      }
    },
    { ctrl: true },
    { enabled: activeTab === 'data' && !!table }
  );

  // Toggle fullscreen with F11
  useKeyboardShortcut(
    'F11',
    (e) => {
      if (activeTab === 'data' && table) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      }
    },
    {},
    { enabled: activeTab === 'data' && !!table }
  );

  // Export table as PNG (from fullscreen view)
  const handleExportTablePNG = useCallback(async () => {
    if (!fullscreenTableRef.current || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    const toastId = toast.loading("Preparing export...", {
      description: (
        <div className="w-full mt-2">
          <Progress value={0} className="h-2" />
        </div>
      ),
    });

    try {
      // Simulate smooth progress animation
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(currentProgress + 2 + Math.random() * 3, 85);
        setExportProgress(currentProgress);
        toast.loading("Generating high-quality image...", {
          id: toastId,
          description: (
            <div className="w-full mt-2 space-y-1">
              <Progress value={currentProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</p>
            </div>
          ),
        });
      }, 80);

      // Get dimensions
      const { width, height } = fullscreenTableRef.current.getBoundingClientRect();
      
      // Use very high pixel ratio for maximum clarity (4x for ultra-high quality)
      const pixelRatio = 4;
      
      const dataUrl = await toPng(fullscreenTableRef.current, {
        backgroundColor: "white",
        pixelRatio: pixelRatio,
        width: width * pixelRatio,
        height: height * pixelRatio,
        quality: 1.0,
        filter: (node) => {
          // Exclude UI elements but keep table content
          if (node.classList?.contains("react-flow__controls")) return false;
          return true;
        },
      });

      clearInterval(progressInterval);
      setExportProgress(100);
      
      toast.loading("Finalizing export...", {
        id: toastId,
        description: (
          <div className="w-full mt-2 space-y-1">
            <Progress value={100} className="h-2" />
            <p className="text-xs text-muted-foreground">100%</p>
          </div>
        ),
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const link = document.createElement("a");
      link.download = `table-${table?.name || 'export'}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Exported as high-quality PNG (4x resolution)", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      toast.error("Failed to export table", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting, table]);

  // Export table as SVG (from fullscreen view)
  const handleExportTableSVG = useCallback(async () => {
    if (!fullscreenTableRef.current || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    const toastId = toast.loading("Preparing export...", {
      description: (
        <div className="w-full mt-2">
          <Progress value={0} className="h-2" />
        </div>
      ),
    });

    try {
      // Simulate smooth progress animation
      let currentProgress = 0;
      const progressInterval = setInterval(() => {
        currentProgress = Math.min(currentProgress + 2 + Math.random() * 3, 85);
        setExportProgress(currentProgress);
        toast.loading("Generating vector image...", {
          id: toastId,
          description: (
            <div className="w-full mt-2 space-y-1">
              <Progress value={currentProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round(currentProgress)}%</p>
            </div>
          ),
        });
      }, 80);

      const dataUrl = await toSvg(fullscreenTableRef.current, {
        backgroundColor: "white",
        quality: 1.0,
        filter: (node) => {
          if (node.classList?.contains("react-flow__controls")) return false;
          return true;
        },
      });

      clearInterval(progressInterval);
      setExportProgress(100);
      
      toast.loading("Finalizing export...", {
        id: toastId,
        description: (
          <div className="w-full mt-2 space-y-1">
            <Progress value={100} className="h-2" />
            <p className="text-xs text-muted-foreground">100%</p>
          </div>
        ),
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      const link = document.createElement("a");
      link.download = `table-${table?.name || 'export'}-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
      
      toast.success("Exported as SVG (vectorized, perfect for zooming!)", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      toast.error("Failed to export table", { id: toastId });
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting, table]);

  // Handle chart generation
  const handleGenerateChart = useCallback(async (options: ChartOptions) => {
    if (!activeConnection || !parsedTable || !table) {
      toast.error("Cannot generate chart", {
        description: "Table information not available",
      });
      return;
    }

    setIsGeneratingChart(true);
    setChartOptions(options);

    try {
      const chartResponse = await chartsService.getTableChartData(
        activeConnection.id,
        parsedTable.schema,
        parsedTable.tableName,
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
  }, [activeConnection, parsedTable, table]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: paginatedData?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  // Early returns after ALL hooks are called
  if (!parsedTable) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium mb-2">Invalid Table ID</p>
          <p className="text-sm">The table ID format is invalid. Expected format: schema.tableName</p>
        </div>
      </div>
    );
  }

  if (!activeConnection) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium mb-2">No Connection Selected</p>
          <p className="text-sm">Please select a database connection to view table data.</p>
        </div>
      </div>
    );
  }

  // Always render the layout structure - use ghost loading for smooth transitions
  // Only show error if we have a real error and no table data AND not transitioning
  // This prevents showing errors during normal transitions
  if (tableError && !displayTable && !isTransitioning && !tableLoading) {
    return (
      <div className="p-6 space-y-4">
        <ErrorDisplay
          error={tableErrorDetails || new Error('Table not found or connection error')}
          title="Failed to load table"
          onRetry={() => {
            queryClient.invalidateQueries({
              queryKey: ['table-details', activeConnection?.id, parsedTable?.schema, parsedTable?.tableName],
            });
          }}
        />
        {activeConnection && (
          <ConnectionErrorHandler
            error={tableErrorDetails}
            connectionId={activeConnection.id}
          />
        )}
        <Button variant="outline" onClick={() => navigate('/')}>
          Back to Schema Browser
        </Button>
      </div>
    );
  }

  // Determine if we should show ghost loading
  // Only show ghost loading if:
  // 1. We're transitioning AND no table is loaded yet, OR
  // 2. We have no display table AND we're fetching AND no persisted data
  // Don't show if we have table details loaded (even without rows)
  const showGhostLoading = (isTransitioning && !table && !displayTable) || 
                           (!displayTable && isFetching && !paginatedData.length && !persistedTableData && !table);
  const columnsToShow = displayTable?.columns || previousTable?.columns || [];
  const columnCount = columnsToShow.length || 5;
  
  // Determine if we should fade out previous content (when transitioning to new table)
  // Only fade out if we're transitioning, have previous table, but no current table yet
  // Once we have the new table, stop fading out
  const shouldFadeOut = isTransitioning && previousTable && !table && !displayTable;
  
  // Get filtered columns for display (use all columns if none filtered)
  const effectiveFilteredColumns = filteredColumns.length > 0 
    ? filteredColumns 
    : (displayTable?.columns || []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <TableBreadcrumb trail={breadcrumbTrail} onNavigate={handleBreadcrumbNavigate} />
        <div className="flex items-center justify-between mb-4 mt-3">
          <div className="flex items-center gap-3">
            <Table2 className="w-6 h-6 text-primary" />
            <div>
              <div className="relative">
                {/* Real content with fade transition */}
                <div
                  className={cn(
                    "transition-opacity duration-300 ease-in-out",
                    (showGhostLoading && !displayTable) || shouldFadeOut ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
                  )}
                >
                  <h1 className="text-2xl font-bold">
                    {displayTable?.schema || 'Loading...'}.{displayTable?.name || ''}
                    {isFetching && displayTable && <span className="ml-2 text-muted-foreground text-sm font-normal">(loading...)</span>}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {displayTable ? (
                      <>
                        {pagination?.filteredRows !== undefined && pagination.filteredRows !== pagination.totalRows
                          ? `${pagination.filteredRows.toLocaleString()} of ${pagination.totalRows.toLocaleString()} rows`
                          : `${pagination?.totalRows?.toLocaleString() || displayTable.rowCount?.toLocaleString() || 0} rows`}
                        {' • '}
                        {displayTable.size || '0 B'} • {displayTable.columns?.length || 0} columns
                        {renderTime > 0 && <span className="text-primary ml-2">• Rendered in {renderTime}ms</span>}
                      </>
                    ) : (
                      <span>Loading table information...</span>
                    )}
                  </p>
                </div>
                {/* Ghost loading with fade transition */}
                {showGhostLoading && !displayTable && (
                  <div className="transition-opacity duration-300 ease-in-out opacity-100">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {displayTable ? (
              <>
                <DataFilters
                  columns={displayTable.columns}
                  initialFilters={filters}
                  onApplyFilters={(newFilters: FilterRule[]) => {
                    setFilters(newFilters);
                  }}
                />
                <ColumnManager
                  columns={displayTable.columns}
                  visibleColumns={visibleColumns}
                  onToggleColumn={handleToggleColumn}
                  onToggleAll={handleToggleAllColumns}
                />
              </>
            ) : (
              <>
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
              </>
            )}
            <ShortcutTooltip shortcut="Ctrl+R" description="Refresh table data">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleRefresh}
                disabled={isLoading || !displayTable}
              >
                <RefreshCcw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </ShortcutTooltip>
            <ShortcutTooltip shortcut="F11" description="Maximize table view">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setIsFullscreen(true)}
                disabled={!displayTable || activeTab !== 'data'}
              >
                <Maximize2 className="w-4 h-4" />
                Maximize
              </Button>
            </ShortcutTooltip>
            {displayTable && activeConnection && parsedTable && (
              <>
                {editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMode(false);
                      setEditingCell(null);
                    }}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Exit Edit Mode
                  </Button>
                )}
                {!editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Mode
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setAddRowDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </Button>
                <ExportDialog
                  connectionId={activeConnection.id}
                  schema={parsedTable.schema}
                  table={parsedTable.tableName}
                  tableName={displayTable.name}
                  filters={filters.length > 0 ? filters : undefined}
                  sort={sortColumn ? { column: sortColumn, direction: sortDirection } : undefined}
                  search={searchQuery || undefined}
                  selectedColumns={visibleColumns.length > 0 && visibleColumns.length < displayTable.columns.length ? visibleColumns : undefined}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs 
        key="main-tabs"
        value={activeTab} 
        onValueChange={(value) => {
          setActiveTab(value);
        }} 
        className="flex-1 flex flex-col"
      >
        <div className="border-b border-border px-6">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="charts" className="gap-2">
              <BarChart3 className="w-3.5 h-3.5" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="indexes">Indexes</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
            <TabsTrigger value="ddl">DDL</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="data" className="mt-0 h-full" forceMount>
            <div className="p-6 space-y-4">
              <div className="flex gap-4 items-center flex-wrap">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search in table..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                {selectedRows.size > 0 && (
                  <BulkActionsToolbar
                    selectedCount={selectedRows.size}
                    onUpdate={() => setUpdateDialogOpen(true)}
                    onDelete={handleDeleteClick}
                    onExport={handleBulkExport}
                    onClearSelection={() => setSelectedRows(new Set())}
                    isUpdating={isUpdating}
                    isDeleting={isDeleting}
                  />
                )}
                {editMode && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md">
                    <Edit className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Edit Mode Active</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditMode(false);
                        setEditingCell(null);
                      }}
                      className="h-6 px-2"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={pageSize}
                    onValueChange={(value) => {
                      setPageSize(value);
                      setCurrentPage(1); // Reset to first page when changing page size
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="transition-none">
                <CardContent className="p-0">
                  <TooltipProvider>
                    <div 
                      ref={parentRef}
                      className="overflow-auto border rounded-lg"
                      style={{ height: '600px' }}
                    >
                      <div className="min-w-full inline-block align-middle">
                        <div className="overflow-hidden">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-table-header border-b">
                          <div className="flex relative">
                            <div className="w-12 px-3 py-3 text-center border-r bg-table-header flex items-center justify-center">
                              <div className="relative w-full h-full flex items-center justify-center">
                                {/* Real checkbox */}
                                <div
                                  className={cn(
                                    "transition-opacity duration-300 ease-in-out",
                                    showGhostLoading || shouldFadeOut ? "opacity-0 absolute inset-0" : "opacity-100"
                                  )}
                                >
                                  <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={handleSelectAll}
                                    className="cursor-pointer"
                                    aria-label="Select all rows"
                                  />
                                </div>
                                {/* Ghost skeleton */}
                                {showGhostLoading && (
                                  <div className="transition-opacity duration-300 ease-in-out opacity-100">
                                    <Skeleton className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="relative w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r bg-table-header">
                              {/* Real # header */}
                              <div
                                className={cn(
                                  "transition-opacity duration-300 ease-in-out",
                                  showGhostLoading || shouldFadeOut ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
                                )}
                              >
                                #
                              </div>
                              {/* Ghost skeleton for # header */}
                              {showGhostLoading && (
                                <div className="transition-opacity duration-300 ease-in-out opacity-100">
                                  <Skeleton className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="relative flex-1 flex">
                              {/* Real columns */}
                              <div
                                className={cn(
                                  "flex transition-opacity duration-300 ease-in-out",
                                  showGhostLoading || shouldFadeOut ? "opacity-0 absolute inset-0" : "opacity-100"
                                )}
                              >
                                {filteredColumns.map((column) => (
                                <div
                                  key={column.name}
                                  className="text-left text-xs font-semibold uppercase tracking-wider border-r overflow-hidden"
                                  style={{ minWidth: columnWidths[column.name] || 150, width: columnWidths[column.name] || 150, maxWidth: columnWidths[column.name] || 150 }}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2 font-semibold flex items-center w-full max-w-full min-w-0 px-4 py-3"
                                        onClick={() => handleSort(column.name)}
                                      >
                                        <span className="truncate min-w-0 flex-1 text-left max-w-full">{column.name}</span>
                                        {column.isPrimaryKey && <Key className="w-3 h-3 text-primary flex-shrink-0" />}
                                        {sortColumn === column.name ? (
                                          sortDirection === "asc" ? (
                                            <ArrowUp className="w-3 h-3 flex-shrink-0" />
                                          ) : (
                                            <ArrowDown className="w-3 h-3 flex-shrink-0" />
                                          )
                                        ) : (
                                          <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{column.name}</p>
                                      {column.type && <p className="text-xs text-muted-foreground mt-1">{column.type}</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                ))}
                              </div>
                              {/* Ghost header columns */}
                              {showGhostLoading && (
                                <div className="flex transition-opacity duration-300 ease-in-out opacity-100">
                                  {Array.from({ length: columnCount }).map((_, i) => (
                                    <div
                                      key={`ghost-header-${i}`}
                                      className="border-r overflow-hidden"
                                      style={{ minWidth: 150, width: 150, maxWidth: 150 }}
                                    >
                                      <Skeleton className="h-8 mx-4 my-3" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Body */}
                        <div
                          style={{
                            height: showGhostLoading ? '400px' : `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                          }}
                        >
                          <div className="relative w-full h-full">
                            {/* Real data with fade transition */}
                            <div
                              className={cn(
                                "transition-opacity duration-300 ease-in-out",
                                showGhostLoading || shouldFadeOut ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
                              )}
                            >
                              {dataError ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-20 text-destructive" />
                              <p className="text-destructive">Failed to load table data</p>
                              <p className="text-sm mt-1">
                                {dataErrorDetails instanceof Error ? dataErrorDetails.message : 'An error occurred'}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => refetchData()}
                              >
                                Retry
                              </Button>
                            </div>
                          ) : paginatedData.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <p>No data found</p>
                              {(filters.length > 0 || debouncedSearchQuery) && (
                                <p className="text-sm mt-2">
                                  Try adjusting your filters or search query
                                </p>
                              )}
                            </div>
                          ) : (
                            rowVirtualizer.getVirtualItems().map((virtualRow) => {
                              const row = paginatedData?.[virtualRow.index];
                              if (!row) return null;
                              const rowId = getRowId(row, virtualRow.index);
                              const isSelected = selectedRows.has(rowId);
                              // Check if this is the last visible row to determine tooltip side
                              // This prevents tooltips from being cut off at the bottom of the table
                              const virtualItems = rowVirtualizer.getVirtualItems();
                              const isLastVisibleRow = virtualItems.length > 0 && virtualRow.index === virtualItems[virtualItems.length - 1]?.index;
                              return (
                                <div
                                  key={virtualRow.index}
                                  className={cn(
                                    "absolute top-0 left-0 w-full flex border-b group hover:z-10 transition-all",
                                    isSelected && "bg-primary/5"
                                  )}
                                  style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                  }}
                                >
                                  <div className="w-12 px-3 py-3 border-r bg-background group-hover:bg-muted flex items-center justify-center transition-colors">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleRowSelection(rowId)}
                                      className="cursor-pointer"
                                      aria-label={`Select row ${virtualRow.index + 1}`}
                                    />
                                  </div>
                                  <div className="w-16 px-4 py-3 font-mono text-xs text-muted-foreground border-r bg-background group-hover:bg-muted flex items-center transition-colors">
                                    {(currentPage - 1) * pageSizeNum + virtualRow.index + 1}
                                  </div>
                                   {filteredColumns.map((column) => {
                                     const cellId = `${virtualRow.index}-${column.name}`;
                                     const value = row[column.name];
                                     const isForeignKey = column.isForeignKey;
                                     const displayValue = value !== null && value !== undefined 
                                       ? (isForeignKey ? value : String(value))
                                       : null;
                                     
                                     // Check if this cell is being edited
                                     const isEditingThisCell = editMode && editingCell?.rowId === rowId && editingCell?.columnName === column.name;
                                     // Can't edit primary keys or foreign keys in edit mode
                                     const canEdit = editMode && !column.isPrimaryKey && !isForeignKey;
                                     
                                     return (
                                       <div
                                         key={column.name}
                                         className="px-4 py-3 font-mono text-sm border-r group/cell relative flex items-center bg-background group-hover:bg-muted transition-colors"
                                         style={{ minWidth: columnWidths[column.name] || 150, width: columnWidths[column.name] || 150 }}
                                       >
                                         <div className="flex items-center justify-between gap-2 w-full min-w-0">
                                           {isEditingThisCell ? (
                                             <EditableCell
                                               value={value}
                                               column={column}
                                               isEditing={true}
                                               isSaving={isSavingCell}
                                               onStartEdit={() => handleStartEditCell(rowId, column.name)}
                                               onCancelEdit={handleCancelEditCell}
                                               onSave={(newValue) => handleSaveCellEdit(rowId, column.name, newValue)}
                                               className="flex-1 min-w-0"
                                             />
                                           ) : canEdit ? (
                                             <EditableCell
                                               value={value}
                                               column={column}
                                               isEditing={false}
                                               onStartEdit={() => handleStartEditCell(rowId, column.name)}
                                               onCancelEdit={handleCancelEditCell}
                                               onSave={(newValue) => handleSaveCellEdit(rowId, column.name, newValue)}
                                               className="flex-1 min-w-0"
                                             />
                                           ) : displayValue !== null ? (
                                             <Tooltip>
                                               <TooltipTrigger asChild>
                                                  <span className="truncate flex-1 min-w-0 cursor-default">
                                                    {isForeignKey && activeConnection && parsedTable ? (
                                                      <ForeignKeyCell 
                                                        value={value}
                                                        columnName={column.name}
                                                        connectionId={activeConnection.id}
                                                        schema={parsedTable.schema}
                                                        table={table}
                                                      />
                                                    ) : (
                                                      displayValue
                                                    )}
                                                  </span>
                                               </TooltipTrigger>
                                               <TooltipContent side={isLastVisibleRow ? "top" : "bottom"} className="max-w-md">
                                                 <div className="font-mono text-sm break-words whitespace-pre-wrap">
                                                   {String(value)}
                                                 </div>
                                                 {column.type && (
                                                   <div className="text-xs text-muted-foreground mt-1">
                                                     {column.type}
                                                   </div>
                                                 )}
                                               </TooltipContent>
                                             </Tooltip>
                                           ) : (
                                             <span className="truncate flex-1 min-w-0 text-muted-foreground italic">
                                               NULL
                                             </span>
                                           )}
                                           {!isForeignKey && !canEdit && !isEditingThisCell && (
                                             <Button
                                               variant="ghost"
                                               size="icon"
                                               className="h-6 w-6 opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0"
                                               onClick={() => handleCopyCell(value, cellId)}
                                             >
                                               {copiedCell === cellId ? (
                                                 <Check className="w-3 h-3 text-success" />
                                               ) : (
                                                 <Copy className="w-3 h-3" />
                                               )}
                                             </Button>
                                           )}
                                         </div>
                                       </div>
                                     );
                                   })}
                                </div>
                              );
                            })
                          )}
                            </div>
                            {/* Ghost loading rows with fade transition */}
                            {showGhostLoading && (
                              <div className="transition-opacity duration-300 ease-in-out opacity-100 absolute inset-0">
                                <div className="space-y-0">
                                  {Array.from({ length: 8 }).map((_, rowIdx) => (
                                    <div key={`ghost-row-${rowIdx}`} className="flex border-b">
                                      <div className="w-12 px-3 py-3 flex items-center justify-center border-r">
                                        <Skeleton className="w-4 h-4" />
                                      </div>
                                      <div className="w-16 px-4 py-3 border-r">
                                        <Skeleton className="h-4 w-8" />
                                      </div>
                                      {Array.from({ length: columnCount }).map((_, colIdx) => (
                                        <div
                                          key={`ghost-cell-${rowIdx}-${colIdx}`}
                                          className="border-r px-4 py-3"
                                          style={{ minWidth: 150, width: 150, maxWidth: 150 }}
                                        >
                                          <Skeleton className="h-4 w-full" />
                                        </div>
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground flex items-center gap-4">
                  <span>
                    {isFetching && !pagination ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : pagination ? (
                      <>
                        Showing {((currentPage - 1) * pageSizeNum) + 1} to{' '}
                        {Math.min(currentPage * pageSizeNum, pagination.filteredRows || pagination.totalRows)} of{' '}
                        {(pagination.filteredRows || pagination.totalRows).toLocaleString()}{' '}
                        {pagination.filteredRows !== undefined && pagination.filteredRows !== pagination.totalRows && (
                          <span className="text-muted-foreground">
                            (filtered from {pagination.totalRows.toLocaleString()})
                          </span>
                        )}{' '}
                        rows
                      </>
                    ) : (
                      <span className="text-muted-foreground">No data</span>
                    )}
                  </span>
                  {isFetching && <span className="text-primary">• Loading...</span>}
                  <span className="text-xs">
                    Virtual scrolling enabled • Press <kbd className="px-1.5 py-0.5 bg-muted rounded border text-foreground">Cmd+R</kbd> to refresh
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    Last
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="mt-0" forceMount>
            <div className="p-6 space-y-4">
              {showGhostLoading && !displayTable ? (
                // Ghost loading for charts
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-96 w-full" />
                    </CardContent>
                  </Card>
                </div>
              ) : !displayTable ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <p>Table data is required to generate charts. Please load a table first.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <ChartBuilder
                    columns={displayTable.columns}
                    onGenerateChart={handleGenerateChart}
                    isLoading={isGeneratingChart}
                  />
                  {chartData && chartOptions && (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Chart Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartViewer chartData={chartData} height={400} />
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="structure" className="mt-0" forceMount>
            <div className="p-6 space-y-4">
              {showGhostLoading && !displayTable ? (
                // Ghost loading for structure
                <>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Card key={`ghost-column-${idx}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-32" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-24 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-40" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : (
                displayTable?.columns?.map((column, idx) => (
                <Card key={`column-${column.name}-${idx}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-mono">{column.name}</CardTitle>
                      <div className="flex gap-2">
                        {column.isPrimaryKey && (
                          <Badge variant="secondary">Primary Key</Badge>
                        )}
                        {column.isForeignKey && (
                          <Badge variant="outline">Foreign Key</Badge>
                        )}
                        {!column.nullable && <Badge variant="outline">NOT NULL</Badge>}
                      </div>
                    </div>
                    <CardDescription>{column.type}</CardDescription>
                  </CardHeader>
                  {column.defaultValue && (
                    <CardContent>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Default: </span>
                        <code className="bg-code-bg px-2 py-1 rounded text-xs">
                          {column.defaultValue}
                        </code>
                      </div>
                    </CardContent>
                  )}
                </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="indexes" className="mt-0" forceMount>
            <div className="p-6 space-y-4">
              {showGhostLoading && !displayTable ? (
                // Ghost loading for indexes
                <>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Card key={`ghost-index-${idx}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-40" />
                          <div className="flex gap-2">
                            <Skeleton className="h-5 w-16" />
                            <Skeleton className="h-5 w-14" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-64 mt-2" />
                      </CardHeader>
                    </Card>
                  ))}
                </>
              ) : (
                displayTable?.indexes?.map((index, idx) => (
                <Card key={`index-${index.name}-${index.columns.join('-')}-${idx}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{index.name}</CardTitle>
                      <div className="flex gap-2">
                        <Badge variant="outline">{index.type}</Badge>
                        {index.unique && <Badge variant="secondary">Unique</Badge>}
                      </div>
                    </div>
                    <CardDescription>
                      Columns: {index.columns.join(", ")}
                    </CardDescription>
                  </CardHeader>
                </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="relationships" className="mt-0" forceMount>
            <div className="p-6">
              {showGhostLoading && !displayTable ? (
                // Ghost loading for relationships
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, idx) => (
                        <Card key={`ghost-fk-${idx}`}>
                          <CardContent className="p-4">
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-3/4" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Skeleton className="h-6 w-40 mb-3" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      Foreign Keys (Outgoing)
                      {displayTable?.foreignKeys && displayTable.foreignKeys.length > 0 && (
                        <Badge variant="secondary">{displayTable.foreignKeys.length}</Badge>
                      )}
                    </h3>
                    {displayTable?.foreignKeys && displayTable.foreignKeys.length > 0 ? (
                    <div className="space-y-3">
                      {displayTable.foreignKeys.map((fk, idx) => (
                        <RelationshipCard
                          key={`fk-${fk.name}-${fk.columns.join('-')}-${idx}`}
                          foreignKey={fk}
                          currentTable={displayTable.name}
                          currentSchema={displayTable.schema}
                          isIncoming={false}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No foreign keys defined</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    Referenced By (Incoming)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Incoming relationships will be available in a future update. Use the ER Diagram view to see all relationships.
                  </p>
                </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ddl" className="mt-0" forceMount>
            <div className="p-6">
              {ddlLoading && !tableDDL ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : ddlError ? (
                <ErrorDisplay
                  error={ddlErrorDetails}
                  title="Failed to load DDL"
                  onRetry={() => queryClient.invalidateQueries({
                    queryKey: ['table-ddl', activeConnection?.id, parsedTable?.schema, parsedTable?.tableName],
                  })}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Table DDL</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (tableDDL) {
                            navigator.clipboard.writeText(tableDDL);
                            toast.success('DDL copied to clipboard');
                          }
                        }}
                        disabled={!tableDDL}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="relative rounded-lg border bg-code-bg overflow-hidden">
                    <pre className="p-4 overflow-auto font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
                      <code>{tableDDL || '-- No DDL available'}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        rowCount={selectedRows.size}
        isDeleting={isDeleting}
      />
      
      {/* Bulk Update Dialog */}
      {displayTable && (
        <BulkUpdateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          onConfirm={handleBulkUpdate}
          rowCount={selectedRows.size}
          columns={displayTable.columns}
          selectedRowsData={selectedRowsData}
          isUpdating={isUpdating}
        />
      )}
      
      {/* Bulk Export Dialog */}
      {activeConnection && parsedTable && (
        <BulkExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          connectionId={activeConnection.id}
          schema={parsedTable.schema}
          table={parsedTable.tableName}
          rowIds={Array.from(selectedRows)}
          rowCount={selectedRows.size}
        />
      )}
      
      {/* Add Row Dialog */}
      {displayTable && (
        <AddRowDialog
          open={addRowDialogOpen}
          onOpenChange={setAddRowDialogOpen}
          onConfirm={handleAddRow}
          columns={displayTable.columns}
          isInserting={isInserting}
        />
      )}

      {/* Fullscreen Table Dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0 pr-12">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {table?.schema}.{table?.name} - Full View
              </DialogTitle>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2" disabled={isExporting}>
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportTablePNG} disabled={isExporting}>
                      <div className="flex flex-col">
                        <span>Export as PNG</span>
                        <span className="text-xs text-muted-foreground">Ultra-high resolution (4x)</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportTableSVG} disabled={isExporting}>
                      <div className="flex flex-col">
                        <span>Export as SVG</span>
                        <span className="text-xs text-muted-foreground">Vector format (perfect for zooming)</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6" ref={fullscreenTableRef}>
            <TooltipProvider>
              <div className="border rounded-lg overflow-auto bg-background">
                <div className="min-w-full inline-block">
                  {/* Header */}
                  <div className="sticky top-0 z-10 bg-table-header border-b">
                    <div className="flex">
                      <div className="w-12 px-3 py-3 text-center border-r bg-table-header flex items-center justify-center">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          className="cursor-pointer"
                          aria-label="Select all rows"
                        />
                      </div>
                      <div className="relative w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r bg-table-header">
                        {/* Real # header */}
                        <div
                          className={cn(
                            "transition-opacity duration-300 ease-in-out",
                            showGhostLoading || shouldFadeOut ? "opacity-0 absolute inset-0 pointer-events-none" : "opacity-100"
                          )}
                        >
                          #
                        </div>
                        {/* Ghost skeleton for # header */}
                        {showGhostLoading && (
                          <div className="transition-opacity duration-300 ease-in-out opacity-100">
                            <Skeleton className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      {/* Show ALL columns in fullscreen view, not just filtered ones */}
                      {(table?.columns || []).map((column) => (
                        <div
                          key={column.name}
                          className="text-left text-xs font-semibold uppercase tracking-wider border-r overflow-hidden bg-table-header"
                          style={{ minWidth: columnWidths[column.name] || 200, width: columnWidths[column.name] || 200 }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-2 font-semibold flex items-center w-full max-w-full min-w-0 px-4 py-3"
                                onClick={() => handleSort(column.name)}
                              >
                                <span className="truncate min-w-0 flex-1 text-left max-w-full">{column.name}</span>
                                {column.isPrimaryKey && <Key className="w-3 h-3 text-primary flex-shrink-0" />}
                                {sortColumn === column.name ? (
                                  sortDirection === "asc" ? (
                                    <ArrowUp className="w-3 h-3 flex-shrink-0" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3 flex-shrink-0" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-30 flex-shrink-0" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{column.name}</p>
                              {column.type && <p className="text-xs text-muted-foreground mt-1">{column.type}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Body - Show all rows without virtualization for full export */}
                  {(isLoading && paginatedData.length === 0 && !persistedTableData) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-50" />
                      <p>Loading data...</p>
                    </div>
                  ) : dataError ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-20 text-destructive" />
                      <p className="text-destructive">Failed to load table data</p>
                    </div>
                  ) : paginatedData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No data found</p>
                    </div>
                  ) : (
                    paginatedData.map((row, idx) => {
                      const rowId = getRowId(row, idx);
                      const isSelected = selectedRows.has(rowId);
                      const virtualItems = rowVirtualizer.getVirtualItems();
                      const isLastVisibleRow = virtualItems.length > 0 && idx === paginatedData.length - 1;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex border-b group hover:z-10 transition-all",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          <div className="w-12 px-3 py-3 border-r bg-background group-hover:bg-muted flex items-center justify-center transition-colors">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleRowSelection(rowId)}
                              className="cursor-pointer"
                              aria-label={`Select row ${idx + 1}`}
                            />
                          </div>
                          <div className="w-16 px-4 py-3 font-mono text-xs text-muted-foreground border-r bg-background group-hover:bg-muted flex items-center transition-colors">
                            {(currentPage - 1) * pageSizeNum + idx + 1}
                          </div>
                          {/* Show ALL columns in fullscreen view */}
                          {(table?.columns || []).map((column) => {
                            const cellId = `${idx}-${column.name}`;
                            const value = row[column.name];
                            const isForeignKey = column.isForeignKey;
                            const displayValue = value !== null && value !== undefined 
                              ? (isForeignKey ? value : String(value))
                              : null;
                            
                            const isEditingThisCell = editMode && editingCell?.rowId === rowId && editingCell?.columnName === column.name;
                            const canEdit = editMode && !column.isPrimaryKey && !isForeignKey;
                            
                            return (
                              <div
                                key={column.name}
                                className="px-4 py-3 font-mono text-sm border-r group/cell relative flex items-center bg-background group-hover:bg-muted transition-colors"
                                style={{ minWidth: columnWidths[column.name] || 200, width: columnWidths[column.name] || 200 }}
                              >
                                <div className="flex items-center justify-between gap-2 w-full min-w-0">
                                  {isEditingThisCell ? (
                                    <EditableCell
                                      value={value}
                                      column={column}
                                      isEditing={true}
                                      isSaving={isSavingCell}
                                      onStartEdit={() => handleStartEditCell(rowId, column.name)}
                                      onCancelEdit={handleCancelEditCell}
                                      onSave={(newValue) => handleSaveCellEdit(rowId, column.name, newValue)}
                                      className="flex-1 min-w-0"
                                    />
                                  ) : canEdit ? (
                                    <EditableCell
                                      value={value}
                                      column={column}
                                      isEditing={false}
                                      onStartEdit={() => handleStartEditCell(rowId, column.name)}
                                      onCancelEdit={handleCancelEditCell}
                                      onSave={(newValue) => handleSaveCellEdit(rowId, column.name, newValue)}
                                      className="flex-1 min-w-0"
                                    />
                                  ) : displayValue !== null ? (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="truncate flex-1 min-w-0 cursor-default">
                                          {isForeignKey && activeConnection && parsedTable ? (
                                            <ForeignKeyCell 
                                              value={value}
                                              columnName={column.name}
                                              connectionId={activeConnection.id}
                                              schema={parsedTable.schema}
                                              table={table}
                                            />
                                          ) : (
                                            displayValue
                                          )}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side={isLastVisibleRow ? "top" : "bottom"} className="max-w-md">
                                        <div className="font-mono text-sm break-words whitespace-pre-wrap">
                                          {String(value)}
                                        </div>
                                        {column.type && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {column.type}
                                          </div>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  ) : (
                                    <span className="truncate flex-1 min-w-0 text-muted-foreground italic">
                                      NULL
                                    </span>
                                  )}
                                  {!isForeignKey && !canEdit && !isEditingThisCell && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 opacity-0 group-hover/cell:opacity-100 transition-opacity flex-shrink-0"
                                      onClick={() => handleCopyCell(value, cellId)}
                                    >
                                      {copiedCell === cellId ? (
                                        <Check className="w-3 h-3 text-success" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TooltipProvider>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableViewer;
