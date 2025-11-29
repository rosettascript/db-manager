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

