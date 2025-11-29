/**
 * Response interface for table data query
 */
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

/**
 * Response interface for table count query
 */
export interface TableCountResponse {
  count: number;
  filtered?: boolean;
}

/**
 * Query parameters for table data endpoint
 */
export interface TableDataQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  columns?: string; // Comma-separated column names
  filters?: string; // JSON stringified FilterRule[]
}

/**
 * Filter rule interface (matches frontend)
 */
export interface FilterRule {
  id?: string;
  column: string;
  operator: string;
  value: string;
}

/**
 * Response interface for row deletion
 */
export interface DeleteRowResponse {
  success: boolean;
  deletedCount: number;
  message?: string;
}

/**
 * Batch delete request interface
 */
export interface BatchDeleteRequest {
  rowIds: string[]; // Array of row IDs (primary key values, comma-separated for composite keys)
}

/**
 * Response interface for batch update
 */
export interface BatchUpdateResponse {
  success: boolean;
  updatedCount: number;
  message?: string;
  errors?: Array<{ rowId: string; error: string }>;
}

/**
 * Response interface for inserting a row
 */
export interface InsertRowResponse {
  success: boolean;
  row?: Record<string, any>; // The inserted row
  message?: string;
}

/**
 * Response interface for updating a single row
 */
export interface UpdateRowResponse {
  success: boolean;
  row?: Record<string, any>; // The updated row
  message?: string;
}

