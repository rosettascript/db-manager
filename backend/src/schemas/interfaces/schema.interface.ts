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

