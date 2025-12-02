/**
 * Interfaces for schema dump components
 */

export interface Extension {
  name: string;
  version: string;
  schema: string;
}

export interface Schema {
  name: string;
  owner: string;
}

export interface Sequence {
  schema: string;
  name: string;
  dataType: string;
  startValue: number;
  increment: number;
  maxValue: number | null;
  minValue: number | null;
  cacheSize: number;
  cycle: boolean;
  owner: string;
}

export interface TableColumn {
  name: string;
  dataType: string;
  udtName?: string; // User-defined type name (useful for arrays)
  isNullable: boolean;
  defaultValue: string | null;
  characterMaximumLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
}

export interface TableConstraint {
  name: string;
  type: 'PRIMARY KEY' | 'UNIQUE' | 'CHECK' | 'FOREIGN KEY';
  definition: string;
  columns?: string[];
  referencedTable?: string;
  referencedColumns?: string[];
}

export interface Table {
  schema: string;
  name: string;
  columns: TableColumn[];
  constraints: TableConstraint[];
  owner: string;
}

export interface Index {
  schema: string;
  tableSchema: string;
  tableName: string;
  name: string;
  definition: string;
  isUnique: boolean;
  method: string;
}

export interface ForeignKey {
  schema: string;
  tableName: string;
  constraintName: string;
  columnName: string;
  foreignTableSchema: string;
  foreignTableName: string;
  foreignColumnName: string;
  onDelete: string;
  onUpdate: string;
}

export interface View {
  schema: string;
  name: string;
  definition: string;
  owner: string;
}

export interface Function {
  schema: string;
  name: string;
  definition: string;
  language: string;
  returnType: string;
  parameters: string;
  owner: string;
}

export interface Trigger {
  schema: string;
  tableName: string;
  name: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: string[];
  functionSchema: string;
  functionName: string;
  condition: string | null;
}

export interface Comment {
  schema: string;
  objectType: 'TABLE' | 'COLUMN' | 'FUNCTION' | 'VIEW' | 'SEQUENCE';
  objectName: string;
  columnName?: string;
  comment: string;
}

export interface Grant {
  schema: string;
  objectType: 'TABLE' | 'SEQUENCE' | 'FUNCTION' | 'SCHEMA';
  objectName: string;
  grantee: string;
  privilege: string;
}

export interface Enum {
  schema: string;
  name: string;
  values: string[];
}

export interface SchemaComponents {
  extensions: Extension[];
  schemas: Schema[];
  enums: Enum[];
  sequences: Sequence[];
  functions: Function[];
  tables: Table[];
  indexes: Index[];
  foreignKeys: ForeignKey[];
  views: View[];
  triggers: Trigger[];
  comments: Comment[];
  grants: Grant[];
}

export interface SchemaDumpOptions {
  includeDrops?: boolean;
  includeGrants?: boolean;
  includeComments?: boolean;
}

