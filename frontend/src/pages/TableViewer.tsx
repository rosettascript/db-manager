import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Table2, Download, Filter, RefreshCcw, Key, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Search, Copy, Check } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useDebounce } from "@/hooks/useDebounce";
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
import { mockTables, mockTableData } from "@/lib/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataFilters } from "@/components/data-viewer/DataFilters";
import { ExportDialog } from "@/components/data-viewer/ExportDialog";
import { ColumnManager } from "@/components/data-viewer/ColumnManager";
import { TableBreadcrumb } from "@/components/table-viewer/TableBreadcrumb";
import { RelationshipCard } from "@/components/table-viewer/RelationshipCard";
import { ForeignKeyCell } from "@/components/table-viewer/ForeignKeyCell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";

const TableViewer = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const table = mockTables.find((t) => t.id === tableId);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState("100");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [renderTime, setRenderTime] = useState<number>(0);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<Array<{ id: string; name: string; schema: string }>>([]);
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  if (!table) {
    return <div className="p-6">Table not found</div>;
  }

  // Initialize visible columns and widths once
  useEffect(() => {
    if (visibleColumns.length === 0 && table.columns.length > 0) {
      setVisibleColumns(table.columns.map(c => c.name));
      const initialWidths: Record<string, number> = {};
      table.columns.forEach(col => {
        initialWidths[col.name] = 150; // Default width
      });
      setColumnWidths(initialWidths);
    }
  }, [table.columns, visibleColumns.length]);

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
        console.error('Failed to parse saved trail:', e);
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
    navigate(`/table/${targetTableId}`);
  }, [breadcrumbTrail, navigate]);

  const tableData = useMemo(
    () => mockTableData[tableId as keyof typeof mockTableData] || [],
    [tableId]
  );

  // Memoized filter data based on debounced search
  const filteredData = useMemo(() => {
    if (!debouncedSearchQuery) return tableData;
    
    const query = debouncedSearchQuery.toLowerCase();
    return tableData.filter((row: any) =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(query)
      )
    );
  }, [tableData, debouncedSearchQuery]);

  // Memoized sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a: any, b: any) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const compare = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? compare : -compare;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Memoized paginate data
  const { paginatedData, totalPages, pageSizeNum } = useMemo(() => {
    const size = parseInt(pageSize);
    const pages = Math.ceil(sortedData.length / size);
    const data = sortedData.slice(
      (currentPage - 1) * size,
      currentPage * size
    );
    return { paginatedData: data, totalPages: pages, pageSizeNum: size };
  }, [sortedData, pageSize, currentPage]);

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
      console.error('Failed to copy:', err);
      toast.error("Failed to copy");
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Data refreshed");
    }, 500);
  }, []);

  const handleToggleColumn = (columnName: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnName)
        ? prev.filter(c => c !== columnName)
        : [...prev, columnName]
    );
  };

  const handleToggleAllColumns = (visible: boolean) => {
    setVisibleColumns(visible ? table.columns.map(c => c.name) : []);
  };

  const filteredColumns = useMemo(
    () => table.columns.filter(col => visibleColumns.includes(col.name)),
    [table.columns, visibleColumns]
  );

  const handleCopyRow = useCallback(async (row: any) => {
    try {
      const text = filteredColumns.map(col => row[col.name]).join('\t');
      await navigator.clipboard.writeText(text);
      toast.success("Row copied to clipboard");
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error("Failed to copy row");
    }
  }, [filteredColumns]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + R to refresh
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  // Virtual scrolling setup
  const rowVirtualizer = useVirtualizer({
    count: paginatedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4 animate-fade-in">
        <TableBreadcrumb trail={breadcrumbTrail} onNavigate={handleBreadcrumbNavigate} />
        <div className="flex items-center justify-between mb-4 mt-3">
          <div className="flex items-center gap-3">
            <Table2 className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
                {table.schema}.{table.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {table.rowCount.toLocaleString()} rows • {table.size} • {table.columns.length} columns
                {renderTime > 0 && <span className="text-primary ml-2">• Rendered in {renderTime}ms</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <DataFilters columns={table.columns} onApplyFilters={() => {}} />
            <ColumnManager
              columns={table.columns}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
              onToggleAll={handleToggleAllColumns}
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ExportDialog tableName={table.name} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="data" className="flex-1 flex flex-col">
        <div className="border-b border-border px-6">
          <TabsList>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="indexes">Indexes</TabsTrigger>
            <TabsTrigger value="relationships">Relationships</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="data" className="mt-0 h-full">
            <div className="p-6 space-y-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search in table..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select value={pageSize} onValueChange={setPageSize}>
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

              <Card>
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
                          <div className="flex">
                            <div className="w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r bg-table-header">
                              #
                            </div>
                            {filteredColumns.map((column) => (
                              <div
                                key={column.name}
                                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r"
                                style={{ minWidth: columnWidths[column.name] || 150, width: columnWidths[column.name] || 150 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-2 -ml-3 font-semibold flex items-center"
                                  onClick={() => handleSort(column.name)}
                                >
                                  <span className="truncate">{column.name}</span>
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
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Body */}
                        <div
                          style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                          }}
                        >
                          {paginatedData.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              {isLoading ? 'Loading...' : 'No data found'}
                            </div>
                          ) : (
                            rowVirtualizer.getVirtualItems().map((virtualRow) => {
                              const row = paginatedData[virtualRow.index];
                              return (
                                <div
                                  key={virtualRow.index}
                                  className="absolute top-0 left-0 w-full flex border-b hover:bg-table-row-hover group"
                                  style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                  }}
                                >
                                  <div className="w-16 px-4 py-3 font-mono text-xs text-muted-foreground border-r bg-background group-hover:bg-table-row-hover flex items-center">
                                    {(currentPage - 1) * pageSizeNum + virtualRow.index + 1}
                                  </div>
                                   {filteredColumns.map((column) => {
                                     const cellId = `${virtualRow.index}-${column.name}`;
                                     const value = row[column.name];
                                     const isForeignKey = column.isForeignKey;
                                     
                                     return (
                                       <div
                                         key={column.name}
                                         className="px-4 py-3 font-mono text-sm border-r group/cell relative flex items-center"
                                         style={{ minWidth: columnWidths[column.name] || 150, width: columnWidths[column.name] || 150 }}
                                       >
                                         <div className="flex items-center justify-between gap-2 w-full">
                                           <span className="truncate flex-1">
                                             {value !== null && value !== undefined ? (
                                               isForeignKey ? (
                                                 <ForeignKeyCell 
                                                   value={value}
                                                   columnName={column.name}
                                                   tableName={table.name}
                                                 />
                                               ) : (
                                                 String(value)
                                               )
                                             ) : (
                                               <span className="text-muted-foreground italic">NULL</span>
                                             )}
                                           </span>
                                           {!isForeignKey && (
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
                      </div>
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground flex items-center gap-4">
                  <span>
                    Showing {((currentPage - 1) * pageSizeNum) + 1} to {Math.min(currentPage * pageSizeNum, sortedData.length)} of {sortedData.length} {sortedData.length !== table.rowCount && `(filtered from ${table.rowCount.toLocaleString()})`} rows
                  </span>
                  {isLoading && <span className="text-primary">• Loading...</span>}
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

          <TabsContent value="structure" className="mt-0">
            <div className="p-6 space-y-4">
              {table.columns.map((column) => (
                <Card key={column.name}>
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
              ))}
            </div>
          </TabsContent>

          <TabsContent value="indexes" className="mt-0">
            <div className="p-6 space-y-4">
              {table.indexes.map((index) => (
                <Card key={index.name}>
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
              ))}
            </div>
          </TabsContent>

          <TabsContent value="relationships" className="mt-0">
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    Foreign Keys (Outgoing)
                    {table.foreignKeys.length > 0 && (
                      <Badge variant="secondary">{table.foreignKeys.length}</Badge>
                    )}
                  </h3>
                  {table.foreignKeys.length > 0 ? (
                    <div className="space-y-3">
                      {table.foreignKeys.map((fk) => {
                        const referencedTable = mockTables.find(t => t.name === fk.referencedTable);
                        return (
                          <RelationshipCard
                            key={fk.name}
                            foreignKey={fk}
                            currentTable={table.name}
                            isIncoming={false}
                            relatedRowCount={referencedTable?.rowCount}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No foreign keys defined</p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    Referenced By (Incoming)
                    {mockTables.filter((t) =>
                      t.foreignKeys.some((fk) => fk.referencedTable === table.name)
                    ).length > 0 && (
                      <Badge variant="secondary">
                        {mockTables.filter((t) =>
                          t.foreignKeys.some((fk) => fk.referencedTable === table.name)
                        ).length}
                      </Badge>
                    )}
                  </h3>
                  {mockTables.filter((t) =>
                    t.foreignKeys.some((fk) => fk.referencedTable === table.name)
                  ).length > 0 ? (
                    <div className="space-y-3">
                      {mockTables
                        .filter((t) =>
                          t.foreignKeys.some((fk) => fk.referencedTable === table.name)
                        )
                        .map((t) => {
                          const relevantFks = t.foreignKeys.filter((fk) => fk.referencedTable === table.name);
                          return relevantFks.map((fk) => (
                            <RelationshipCard
                              key={`${t.id}-${fk.name}`}
                              foreignKey={fk}
                              currentTable={table.name}
                              isIncoming={true}
                              referencingTable={t.name}
                              relatedRowCount={t.rowCount}
                            />
                          ));
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tables reference this table
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default TableViewer;
