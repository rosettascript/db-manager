/**
 * API Types - Match backend response structures
 */

// Connection types
export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string; // ISO date string
}

export interface CreateConnectionDto {
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
}

export interface UpdateConnectionDto {
  name?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  sslMode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
}

export interface ConnectionStatus {
  connected: boolean;
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface ConnectionTestResponse {
  success: boolean;
  message?: string;
  connectionTime?: number;
}

// Schema types
export interface Schema {
  name: string;
  tables?: Table[];
}

export interface Table {
  id: string;
  name: string;
  schema: string;
  rowCount: number;
  size: string;
  sizeBytes: number;
  columns: Column[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description?: string;
}

export interface Index {
  name: string;
  type: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKey {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedSchema?: string;
  referencedColumns: string[];
}

export interface DatabaseStats {
  schemaCount: number;
  tableCount: number;
  totalRows: number;
  totalSize: string;
  totalSizeBytes: number;
}

export type FunctionCategory = 'user' | 'extension' | 'system';

export interface DatabaseFunction {
  id: string;
  name: string;
  schema: string;
  language: string;
  returnType: string;
  parameters: string;
  owner: string;
  category: FunctionCategory;
  extensionName?: string;
}

export interface DatabaseView {
  id: string;
  name: string;
  schema: string;
  owner: string;
}

export interface DatabaseIndex {
  id: string;
  name: string;
  schema: string;
  tableSchema: string;
  tableName: string;
  type: string;
  unique: boolean;
  columns: string[];
}

// Detailed interfaces for viewer pages
export interface FunctionDetails extends DatabaseFunction {
  definition: string;
}

export interface ViewDetails extends DatabaseView {
  definition: string;
}

export interface IndexDetails extends DatabaseIndex {
  definition: string;
  size?: string;
  sizeBytes?: number;
  isUsed?: boolean;
  indexScans?: number;
}

export interface DatabaseEnum {
  id: string;
  name: string;
  schema: string;
  values: string[];
}

export interface EnumDetails extends DatabaseEnum {
  owner?: string;
  usedInTables?: Array<{
    tableSchema: string;
    tableName: string;
    columnName: string;
  }>;
}

// Table data types
export interface TableDataResponse {
  data: Record<string, any>[];
  pagination: {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    filteredRows?: number;
  };
}

export interface TableCountResponse {
  count: number;
  filtered?: boolean;
}

export interface DeleteRowResponse {
  success: boolean;
  deletedCount: number;
  message?: string;
}

// Batch update types
export interface BatchUpdateResponse {
  success: boolean;
  updatedCount: number;
  message?: string;
  errors?: Array<{ rowId: string; error: string }>;
}

export interface ColumnUpdate {
  column: string;
  value: string;
}

export interface BatchUpdateDto {
  rowIds: string[];
  updates: ColumnUpdate[];
}

export interface FilterRule {
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 
            'gt' | 'lt' | 'gte' | 'lte' | 'is_null' | 'is_not_null';
  value?: any;
}

export interface SortOption {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TableDataQueryParams {
  page?: number;
  pageSize?: number;
  filters?: FilterRule[];
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  columns?: string[];
}

// Query execution types
export interface ExecuteQueryDto {
  query: string;
  timeout?: number;
  maxRows?: number;
  parameters?: Record<string, any>; // Parameter values keyed by parameter name
}

export interface QueryExecutionResponse {
  success: boolean;
  data?: Record<string, any>[];
  columns?: string[];
  rowCount?: number;
  rowsAffected?: number;
  executionTime: number;
  query: string;
  message?: string;
  error?: string;
}

export interface ExplainQueryDto {
  query: string;
  analyze?: boolean;
  parameters?: Record<string, any>;
}

export interface ExplainPlanResponse {
  plan: string;
  planningTime?: number;
  executionTime?: number;
  formattedPlan?: string;
}

// Query history types
export interface QueryHistoryItem {
  id: string;
  connectionId: string;
  query: string;
  timestamp: string; // ISO string date
  executionTime: number;
  rowsAffected?: number;
  rowCount?: number;
  success: boolean;
  error?: string;
}

export interface SavedQuery {
  id: string;
  connectionId: string;
  name: string;
  query: string;
  createdAt: string; // ISO string date
  updatedAt?: string; // ISO string date
  tags?: string[];
  description?: string;
}

export interface CreateSavedQueryDto {
  name: string;
  query: string;
  description?: string;
  tags?: string[];
}

export interface UpdateSavedQueryDto {
  name?: string;
  query?: string;
  description?: string;
  tags?: string[];
}

// ER Diagram types
export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    table: {
      id: string;
      name: string;
      schema: string;
      columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        isPrimaryKey: boolean;
        isForeignKey: boolean;
      }>;
      rowCount?: number;
      size?: string;
      indexes?: Index[];
      foreignKeys?: ForeignKey[];
    };
    isHighlighted?: boolean;
  };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  label?: string;
  labelStyle?: { fontSize: number; fontWeight: number };
  style?: {
    stroke: string;
    strokeWidth: number;
    opacity?: number;
  };
  markerEnd?: any; // ReactFlow MarkerType
}

export interface DiagramResponse {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface RelationshipResponse {
  outgoing: Array<{
    constraintName: string;
    columns: string[];
    referencedSchema: string;
    referencedTable: string;
    referencedColumns: string[];
  }>;
  incoming: Array<{
    constraintName: string;
    schema: string;
    table: string;
    columns: string[];
    referencedColumns: string[];
  }>;
}

// Foreign Key Navigation types
export interface RowLookupResponse {
  found: boolean;
  row?: Record<string, any>;
  error?: string;
}

export interface ForeignKeyLookupResponse {
  found: boolean;
  table: {
    schema: string;
    name: string;
  };
  row?: Record<string, any>;
  error?: string;
}

// Export types
export type ExportFormat = 'csv' | 'json';

export interface TableExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
  filters?: FilterRule[];
  sort?: SortOption;
  search?: string;
  searchColumns?: string[];
  selectedColumns?: string[];
  limit?: number;
}

export interface QueryExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
  query: string;
  timeout?: number;
  maxRows?: number;
}

// Row editing types
export interface InsertRowDto {
  data: Record<string, any>;
}

export interface UpdateRowDto {
  data: Record<string, any>;
}

export interface InsertRowResponse {
  success: boolean;
  row?: Record<string, any>; // The inserted row
  message?: string;
}

export interface UpdateRowResponse {
  success: boolean;
  row?: Record<string, any>; // The updated row
  message?: string;
}

// Chart types
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'timeseries';

export type AggregationFunction = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export type TimeGrouping = 'day' | 'week' | 'month' | 'year' | 'hour' | 'minute';

export interface ChartOptions {
  chartType: ChartType;
  xAxisColumn: string;
  yAxisColumns: string[]; // Multiple for multi-series charts
  aggregation?: AggregationFunction;
  groupBy?: string;
  timeGrouping?: TimeGrouping;
  limit?: number;
  filters?: Array<{
    column: string;
    operator: string;
    value: string;
  }>;
}

export interface ChartDataPoint {
  x: string | number;
  y: number | number[];
  label?: string;
}

export interface ChartDataResponse {
  success: boolean;
  chartType: ChartType;
  data: ChartDataPoint[];
  labels?: string[];
  metadata?: {
    totalRows?: number;
    aggregatedRows?: number;
    xAxisColumn?: string;
    yAxisColumns?: string[];
    aggregation?: AggregationFunction;
  };
  error?: string;
}

// Error types
export interface ApiError {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  error?: string;
}

// Index Recommendations types
export interface QueryPattern {
  query: string;
  executionCount: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
  tables: string[];
  columns: string[];
  lastExecuted: string; // ISO date string
}

export interface IndexRecommendation {
  table: string;
  schema: string;
  columns: string[];
  indexType: 'btree' | 'hash' | 'gin' | 'gist' | 'brin';
  estimatedBenefit: 'high' | 'medium' | 'low';
  reason: string;
  createStatement: string;
  estimatedSize?: string;
}

export interface IndexUsageStat {
  schema: string;
  table: string;
  indexName: string;
  indexSize: string;
  indexSizeBytes: number;
  indexScans: number;
  tuplesRead: number;
  tuplesFetched: number;
  isUsed: boolean;
  lastUsed?: string; // ISO date string
}

export interface IndexAnalysisResponse {
  recommendations: IndexRecommendation[];
  usageStats: IndexUsageStat[];
  queryPatterns: QueryPattern[];
  summary: {
    totalIndexes: number;
    unusedIndexes: number;
    recommendedIndexes: number;
    highPriorityRecommendations: number;
  };
}

// Search types
export interface GlobalSearchResult {
  type: 'table' | 'column' | 'data';
  schema: string;
  table: string;
  column?: string;
  value?: any;
  matchScore?: number;
}

export interface GlobalSearchResponse {
  results: GlobalSearchResult[];
  total: number;
  searchTime: number;
}

export interface ColumnSearchResult {
  schema: string;
  table: string;
  column: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
}

export interface ColumnSearchResponse {
  results: ColumnSearchResult[];
  total: number;
}

export interface ColumnAutocompleteResult {
  schema: string;
  table: string;
  column: string;
  fullPath: string; // schema.table.column
}

// Query Snippets types
export interface QuerySnippet {
  id: string;
  name: string;
  snippet: string;
  description?: string;
  category?: string;
  tags?: string[];
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export interface CreateQuerySnippetDto {
  name: string;
  snippet: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateQuerySnippetDto {
  name?: string;
  snippet?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

// Query Validation types
export interface QueryValidationError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface QueryValidationWarning {
  message: string;
  suggestion?: string;
}

export interface QueryValidationResult {
  isValid: boolean;
  errors: QueryValidationError[];
  warnings: QueryValidationWarning[];
  suggestions: string[];
}

// Query Optimization types
export interface OptimizationRecommendation {
  type: 'index' | 'join' | 'filter' | 'sort' | 'other';
  priority: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  estimatedImpact?: string;
}

export interface QueryOptimizationResult {
  originalPlan: ExplainPlanResponse;
  optimizedPlan?: ExplainPlanResponse;
  recommendations: OptimizationRecommendation[];
  performanceMetrics: {
    estimatedCost?: number;
    executionTime?: number;
    rowsExamined?: number;
  };
}

