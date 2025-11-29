/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'json';

/**
 * Export options interface
 */
export interface ExportOptions {
  format: ExportFormat;
  includeHeaders?: boolean;
  filters?: Array<{
    column: string;
    operator: string;
    value: string;
  }>;
  sort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  search?: string;
  searchColumns?: string[];
  selectedColumns?: string[];
  limit?: number;
}

