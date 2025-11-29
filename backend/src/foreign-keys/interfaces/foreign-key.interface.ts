/**
 * Foreign key lookup response interface
 */
export interface ForeignKeyLookupResponse {
  found: boolean;
  table: {
    schema: string;
    name: string;
  };
  row?: Record<string, any>;
  error?: string;
}

/**
 * Row lookup by ID response interface
 */
export interface RowLookupResponse {
  found: boolean;
  row?: Record<string, any>;
  error?: string;
}

/**
 * Foreign key lookup request interface
 */
export interface ForeignKeyLookupRequest {
  foreignKeyName: string; // Name of the FK constraint
  foreignKeyValue: string | string[]; // Single value or array for composite keys
}

