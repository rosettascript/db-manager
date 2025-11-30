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

