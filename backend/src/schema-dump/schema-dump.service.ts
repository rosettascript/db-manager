import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import {
  SchemaComponents,
  Extension,
  Schema,
  Enum,
  Sequence,
  Table,
  TableColumn,
  TableConstraint,
  Index,
  ForeignKey,
  View,
  Function,
  Trigger,
  Comment,
  Grant,
  SchemaDumpOptions,
} from './interfaces/schema-dump.interface';

/**
 * Local interface for grouped foreign keys (used internally)
 */
interface GroupedForeignKey {
  name: string;
  schema: string;
  tableName: string;
  columns: string[];
  referencedSchema: string;
  referencedTable: string;
  referencedColumns: string[];
  onUpdate: string;
  onDelete: string;
}

@Injectable()
export class SchemaDumpService {
  private readonly logger = new Logger(SchemaDumpService.name);

  constructor(
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /**
   * Generate complete schema dump for a database
   */
  async generateSchemaDump(
    connectionId: string,
    options: SchemaDumpOptions = {},
  ): Promise<string> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    this.logger.log(`Generating schema dump for connection ${connectionId}`);

    // Extract all schema components
    const components: SchemaComponents = {
      extensions: await this.extractExtensions(pool),
      schemas: await this.extractSchemas(pool),
      enums: await this.extractEnums(pool),
      sequences: await this.extractSequences(pool),
      functions: await this.extractFunctions(pool),
      tables: await this.extractTables(pool),
      indexes: await this.extractIndexes(pool),
      foreignKeys: await this.extractForeignKeys(pool),
      views: await this.extractViews(pool),
      triggers: await this.extractTriggers(pool),
      comments: await this.extractComments(pool),
      grants: await this.extractGrants(pool),
    };

    // Generate SQL dump
    const sql = this.generateSQL(components, options);

    this.logger.log(
      `Schema dump generated: ${components.tables.length} tables, ${components.functions.length} functions, ${components.views.length} views`,
    );

    return sql;
  }

  /**
   * Generate DDL for a single table
   */
  async generateTableDDL(
    connectionId: string,
    schema: string,
    tableName: string,
    options: SchemaDumpOptions = {},
  ): Promise<string> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    this.logger.log(
      `Generating DDL for table ${schema}.${tableName} in connection ${connectionId}`,
    );

    // Extract table components
    const table = await this.extractSingleTable(pool, schema, tableName);
    if (!table) {
      throw new NotFoundException(
        `Table ${schema}.${tableName} not found`,
      );
    }

    // Get indexes for this table
    const indexes = await this.extractTableIndexes(pool, schema, tableName);

    // Get foreign keys for this table
    const foreignKeys = await this.extractTableForeignKeys(pool, schema, tableName);

    // Generate DDL
    const ddl = this.generateTableSQL(table, indexes, foreignKeys, options);

    return ddl;
  }

  /**
   * Extract a single table
   */
  private async extractSingleTable(
    pool: Pool,
    schema: string,
    tableName: string,
  ): Promise<Table | null> {
    // Check if table exists
    const tableExistsResult = await pool.query(
      `SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = $1 AND table_name = $2
      ) as exists;`,
      [schema, tableName],
    );

    if (!tableExistsResult.rows[0].exists) {
      return null;
    }

    // Get table owner
    const ownerResult = await pool.query(
      `SELECT pg_get_userbyid(c.relowner) as owner
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = $1 AND c.relname = $2;`,
      [schema, tableName],
    );
    const owner = ownerResult.rows[0]?.owner || '';

    // Get columns with better type information
    const columnsQuery = `
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position;
    `;

    const columnsResult = await pool.query(columnsQuery, [schema, tableName]);
    const columns: TableColumn[] = columnsResult.rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      udtName: row.udt_name || undefined, // Store UDT name for arrays
      isNullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      characterMaximumLength: row.character_maximum_length,
      numericPrecision: row.numeric_precision,
      numericScale: row.numeric_scale,
    }));

    // Get constraints (excluding foreign keys - handled separately)
    const constraintsQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      LEFT JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_schema = $1 
        AND tc.table_name = $2
        AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK')
      ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position;
    `;

    const constraintsResult = await pool.query(constraintsQuery, [
      schema,
      tableName,
    ]);

    // Group constraints by name
    const constraintMap = new Map<string, TableConstraint>();
    for (const row of constraintsResult.rows) {
      const constraintName = row.constraint_name;
      if (!constraintMap.has(constraintName)) {
        const constraint: TableConstraint = {
          name: constraintName,
          type: row.constraint_type,
          columns: [],
          definition: row.check_clause || undefined,
        };

        // For CHECK constraints, try to extract column name from definition
        if (row.constraint_type === 'CHECK' && row.check_clause) {
          // Try to extract column name from patterns like "column_name IS NOT NULL"
          const notNullMatch = row.check_clause.match(/^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+IS\s+NOT\s+NULL$/i);
          if (notNullMatch) {
            constraint.columns = [notNullMatch[1]];
          }
        }

        constraintMap.set(constraintName, constraint);
      }
      const constraint = constraintMap.get(constraintName)!;
      // Add column from key_column_usage (for PRIMARY KEY, UNIQUE, FOREIGN KEY)
      if (row.column_name && !constraint.columns.includes(row.column_name)) {
        constraint.columns.push(row.column_name);
      }
    }

    return {
      schema,
      name: tableName,
      columns,
      constraints: Array.from(constraintMap.values()),
      owner,
    };
  }

  /**
   * Extract indexes for a single table
   */
  private async extractTableIndexes(
    pool: Pool,
    schema: string,
    tableName: string,
  ): Promise<Index[]> {
    const query = `
      SELECT
        i.indexname as name,
        i.indexdef as definition,
        i.indexdef LIKE '%UNIQUE%' as is_unique
      FROM pg_indexes i
      WHERE i.schemaname = $1 AND i.tablename = $2
        AND i.indexname NOT LIKE '%_pkey'
      ORDER BY i.indexname;
    `;

    const result = await pool.query(query, [schema, tableName]);
    return result.rows.map((row) => {
      const methodMatch = row.definition.match(/USING (\w+)/);
      return {
        schema,
        tableSchema: schema,
        tableName,
        name: row.name,
        definition: row.definition,
        isUnique: row.is_unique,
        method: methodMatch ? methodMatch[1] : 'btree',
      };
    });
  }

  /**
   * Extract foreign keys for a single table
   */
  private async extractTableForeignKeys(
    pool: Pool,
    schema: string,
    tableName: string,
  ): Promise<GroupedForeignKey[]> {
    const query = `
      SELECT
        tc.constraint_name as name,
        kcu.column_name,
        ccu.table_schema as referenced_schema,
        ccu.table_name as referenced_table,
        ccu.column_name as referenced_column,
        rc.update_rule as on_update,
        rc.delete_rule as on_delete
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      ORDER BY tc.constraint_name, kcu.ordinal_position;
    `;

    const result = await pool.query(query, [schema, tableName]);

    // Group by constraint name
    const fkMap = new Map<string, GroupedForeignKey>();
    for (const row of result.rows) {
      const fkName = row.name;
      if (!fkMap.has(fkName)) {
        fkMap.set(fkName, {
          name: fkName,
          schema,
          tableName,
          columns: [],
          referencedSchema: row.referenced_schema,
          referencedTable: row.referenced_table,
          referencedColumns: [],
          onUpdate: row.on_update,
          onDelete: row.on_delete,
        });
      }
      const fk = fkMap.get(fkName)!;
      fk.columns.push(row.column_name);
      fk.referencedColumns.push(row.referenced_column);
    }

    return Array.from(fkMap.values());
  }

  /**
   * Generate SQL for a single table
   */
  private generateTableSQL(
    table: Table,
    indexes: Index[],
    foreignKeys: GroupedForeignKey[],
    options: SchemaDumpOptions = {},
  ): string {
    const lines: string[] = [];
    const { includeDrops = false } = options;

    if (includeDrops) {
      lines.push(`DROP TABLE IF EXISTS "${table.schema}"."${table.name}" CASCADE;`);
      lines.push('');
    }

    // CREATE TABLE statement
    lines.push(`CREATE TABLE "${table.schema}"."${table.name}" (`);

    const columnDefs: string[] = [];
    for (const column of table.columns) {
      let def = `    "${column.name}" ${this.formatDataType(column)}`;
      if (!column.isNullable) {
        def += ' NOT NULL';
      }
      if (column.defaultValue) {
        def += ` DEFAULT ${column.defaultValue}`;
      }
      columnDefs.push(def);
    }

    // Add primary key and unique constraints inline if single column
    for (const constraint of table.constraints) {
      if (constraint.type === 'PRIMARY KEY' && constraint.columns?.length === 1) {
        const col = columnDefs.find((c) =>
          c.includes(`"${constraint.columns[0]}"`),
        );
        if (col) {
          columnDefs[
            columnDefs.indexOf(col)
          ] = col.replace(' NOT NULL', ' NOT NULL PRIMARY KEY');
        }
      } else if (
        constraint.type === 'UNIQUE' &&
        constraint.columns?.length === 1
      ) {
        const col = columnDefs.find((c) =>
          c.includes(`"${constraint.columns[0]}"`),
        );
        if (col) {
          columnDefs[columnDefs.indexOf(col)] = col + ' UNIQUE';
        }
      }
    }

    lines.push(columnDefs.join(',\n'));

    // Add multi-column constraints
    const tableConstraints: string[] = [];
    // Create a set of NOT NULL column names for filtering redundant checks
    const notNullColumns = new Set(
      table.columns.filter((c) => !c.isNullable).map((c) => c.name),
    );

    for (const constraint of table.constraints) {
      if (
        constraint.type === 'PRIMARY KEY' &&
        constraint.columns &&
        constraint.columns.length > 1
      ) {
        tableConstraints.push(
          `    CONSTRAINT "${constraint.name}" PRIMARY KEY (${constraint.columns.map((c) => `"${c}"`).join(', ')})`,
        );
      } else if (
        constraint.type === 'UNIQUE' &&
        constraint.columns &&
        constraint.columns.length > 1
      ) {
        tableConstraints.push(
          `    CONSTRAINT "${constraint.name}" UNIQUE (${constraint.columns.map((c) => `"${c}"`).join(', ')})`,
        );
      } else if (constraint.type === 'CHECK' && constraint.definition) {
        // Filter out redundant NOT NULL CHECK constraints
        let isRedundantNotNullCheck = false;
        
        if (constraint.columns && constraint.columns.length === 1) {
          // Check if it's a NOT NULL check on a column that's already NOT NULL
          const columnName = constraint.columns[0];
          isRedundantNotNullCheck =
            /IS\s+NOT\s+NULL/i.test(constraint.definition) &&
            notNullColumns.has(columnName);
        } else if (!constraint.columns || constraint.columns.length === 0) {
          // Try to extract column name from definition if columns array is empty
          const notNullMatch = constraint.definition.match(/^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+IS\s+NOT\s+NULL$/i);
          if (notNullMatch) {
            const columnName = notNullMatch[1];
            isRedundantNotNullCheck = notNullColumns.has(columnName);
          }
        }

        if (!isRedundantNotNullCheck) {
          tableConstraints.push(
            `    CONSTRAINT "${constraint.name}" CHECK (${constraint.definition})`,
          );
        }
      }
    }

    if (tableConstraints.length > 0) {
      lines.push(',');
      lines.push(tableConstraints.join(',\n'));
    }

    lines.push(');');
    lines.push('');

    // Foreign keys
    if (foreignKeys.length > 0) {
      for (const fk of foreignKeys) {
        lines.push(
          `ALTER TABLE "${fk.schema}"."${fk.tableName}"`,
        );
        lines.push(
          `    ADD CONSTRAINT "${fk.name}" FOREIGN KEY (${fk.columns.map((c) => `"${c}"`).join(', ')})`,
        );
        lines.push(
          `    REFERENCES "${fk.referencedSchema}"."${fk.referencedTable}" (${fk.referencedColumns.map((c) => `"${c}"`).join(', ')})`,
        );
        if (fk.onDelete && fk.onDelete !== 'NO ACTION') {
          lines.push(`    ON DELETE ${fk.onDelete}`);
        }
        if (fk.onUpdate && fk.onUpdate !== 'NO ACTION') {
          lines.push(`    ON UPDATE ${fk.onUpdate}`);
        }
        lines.push(';');
        lines.push('');
      }
    }

    // Indexes
    if (indexes.length > 0) {
      for (const index of indexes) {
        lines.push(index.definition + ';');
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract extensions
   */
  private async extractExtensions(pool: Pool): Promise<Extension[]> {
    const query = `
      SELECT 
        e.extname as name,
        e.extversion as version,
        n.nspname as schema
      FROM pg_extension e
      JOIN pg_namespace n ON e.extnamespace = n.oid
      WHERE e.extname != 'plpgsql'
      ORDER BY e.extname;
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => ({
      name: row.name,
      version: row.version,
      schema: row.schema,
    }));
  }

  /**
   * Extract schemas
   */
  private async extractSchemas(pool: Pool): Promise<Schema[]> {
    const query = `
      SELECT 
        nspname as name,
        pg_get_userbyid(nspowner) as owner
      FROM pg_namespace
      WHERE nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
      ORDER BY nspname;
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => ({
      name: row.name,
      owner: row.owner,
    }));
  }

  /**
   * Extract enum types
   */
  private async extractEnums(pool: Pool): Promise<Enum[]> {
    const query = `
      SELECT 
        n.nspname as schema,
        t.typname as name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder)::text[] as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND t.typtype = 'e'
      GROUP BY n.nspname, t.typname
      ORDER BY n.nspname, t.typname;
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => {
      // Ensure values is always an array
      let values = row.values;
      if (!Array.isArray(values)) {
        // If it's a PostgreSQL array string, parse it
        if (typeof values === 'string' && values.startsWith('{') && values.endsWith('}')) {
          values = values.slice(1, -1).split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        } else {
          values = [];
        }
      }
      return {
        schema: row.schema,
        name: row.name,
        values: values,
      };
    });
  }

  /**
   * Extract sequences
   */
  private async extractSequences(pool: Pool): Promise<Sequence[]> {
    const query = `
      SELECT 
        n.nspname as schema,
        c.relname as name,
        t.typname as data_type,
        s.seqstart as start_value,
        s.seqincrement as increment,
        s.seqmax as max_value,
        s.seqmin as min_value,
        s.seqcache as cache_size,
        s.seqcycle as cycle,
        pg_get_userbyid(c.relowner) as owner
      FROM pg_sequence s
      JOIN pg_class c ON s.seqrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_type t ON s.seqtypid = t.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY n.nspname, c.relname;
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => ({
      schema: row.schema,
      name: row.name,
      dataType: row.data_type,
      startValue: parseInt(row.start_value),
      increment: parseInt(row.increment),
      maxValue: row.max_value ? parseInt(row.max_value) : null,
      minValue: row.min_value ? parseInt(row.min_value) : null,
      cacheSize: parseInt(row.cache_size),
      cycle: row.cycle,
      owner: row.owner,
    }));
  }

  /**
   * Extract functions
   */
  private async extractFunctions(pool: Pool): Promise<Function[]> {
    const query = `
      SELECT 
        n.nspname as schema,
        p.proname as name,
        pg_get_functiondef(p.oid) as definition,
        l.lanname as language,
        pg_get_function_result(p.oid) as return_type,
        pg_get_function_arguments(p.oid) as parameters,
        pg_get_userbyid(p.proowner) as owner
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND p.prokind IN ('f', 'p') -- function or procedure
      ORDER BY n.nspname, p.proname, pg_get_function_arguments(p.oid);
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => ({
      schema: row.schema,
      name: row.name,
      definition: row.definition,
      language: row.language,
      returnType: row.return_type,
      parameters: row.parameters || '',
      owner: row.owner,
    }));
  }

  /**
   * Extract tables with columns and constraints
   */
  private async extractTables(pool: Pool): Promise<Table[]> {
    // Get table list
    const tablesQuery = `
      SELECT DISTINCT
        t.table_schema as schema,
        t.table_name as name,
        pg_get_userbyid(c.relowner) as owner
      FROM information_schema.tables t
      JOIN pg_class c ON c.relname = t.table_name
      JOIN pg_namespace n ON n.nspname = t.table_schema AND n.oid = c.relnamespace
      WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_schema, t.table_name;
    `;

    const tablesResult = await pool.query(tablesQuery);
    const tables: Table[] = [];

    for (const tableRow of tablesResult.rows) {
      const schema = tableRow.schema;
      const tableName = tableRow.name;

      // Get columns
      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;

      const columnsResult = await pool.query(columnsQuery, [schema, tableName]);
      const columns: TableColumn[] = columnsResult.rows.map((row) => ({
        name: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable === 'YES',
        defaultValue: row.column_default,
        characterMaximumLength: row.character_maximum_length,
        numericPrecision: row.numeric_precision,
        numericScale: row.numeric_scale,
      }));

      // Get constraints (excluding foreign keys - handled separately)
      const constraintsQuery = `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          cc.check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
          AND tc.table_name = kcu.table_name
        LEFT JOIN information_schema.check_constraints cc
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_schema = $1 
          AND tc.table_name = $2
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK')
        ORDER BY tc.constraint_type, tc.constraint_name, kcu.ordinal_position;
      `;

      const constraintsResult = await pool.query(constraintsQuery, [
        schema,
        tableName,
      ]);

      const constraintsMap = new Map<string, TableConstraint>();
      for (const row of constraintsResult.rows) {
        const constraintName = row.constraint_name;
        if (!constraintsMap.has(constraintName)) {
          constraintsMap.set(constraintName, {
            name: constraintName,
            type: row.constraint_type,
            definition: row.check_clause || '',
            columns: [],
          });
        }
        if (row.column_name) {
          constraintsMap.get(constraintName)!.columns!.push(row.column_name);
        }
      }

      // Filter out redundant NOT NULL CHECK constraints
      // These are redundant because columns already have NOT NULL constraint
      const filteredConstraints = Array.from(constraintsMap.values()).filter(
        (constraint) => {
          // Skip CHECK constraints that are just "column IS NOT NULL"
          if (constraint.type === 'CHECK' && constraint.definition) {
            const checkDef = constraint.definition.trim();
            // Remove surrounding parentheses if present
            const cleanedDef = checkDef.replace(/^\(|\)$/g, '');
            // Match patterns like:
            // - "column IS NOT NULL"
            // - "\"column\" IS NOT NULL"
            // - (column IS NOT NULL)
            const notNullPattern = /^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+IS\s+NOT\s+NULL$/i;
            const match = cleanedDef.match(notNullPattern);
            if (match) {
              const columnName = match[1];
              // Check if the column already has NOT NULL
              const column = columns.find((c) => c.name === columnName);
              if (column && !column.isNullable) {
                // This is redundant, skip it
                return false;
              }
            }
          }
          return true;
        },
      );

      tables.push({
        schema,
        name: tableName,
        columns,
        constraints: filteredConstraints,
        owner: tableRow.owner,
      });
    }

    return tables;
  }

  /**
   * Extract indexes
   */
  private async extractIndexes(pool: Pool): Promise<Index[]> {
    const query = `
      SELECT 
        schemaname as schema,
        tablename as table_name,
        indexname as name,
        indexdef as definition
      FROM pg_indexes
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY schemaname, tablename, indexname;
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => {
      const isUnique = row.definition.includes('UNIQUE');
      const methodMatch = row.definition.match(/USING (\w+)/);
      return {
        schema: row.schema,
        tableSchema: row.schema,
        tableName: row.table_name,
        name: row.name,
        definition: row.definition,
        isUnique,
        method: methodMatch ? methodMatch[1] : 'btree',
      };
    });
  }

  /**
   * Extract foreign keys
   */
  private async extractForeignKeys(pool: Pool): Promise<ForeignKey[]> {
    const query = `
      SELECT
        tc.table_schema as schema,
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_schema as foreign_table_schema,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name,
        rc.delete_rule as on_delete,
        rc.update_rule as on_update
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY tc.table_schema, tc.table_name, tc.constraint_name, kcu.ordinal_position;
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => ({
      schema: row.schema,
      tableName: row.table_name,
      constraintName: row.constraint_name,
      columnName: row.column_name,
      foreignTableSchema: row.foreign_table_schema,
      foreignTableName: row.foreign_table_name,
      foreignColumnName: row.foreign_column_name,
      onDelete: row.on_delete,
      onUpdate: row.on_update,
    }));
  }

  /**
   * Extract views
   */
  private async extractViews(pool: Pool): Promise<View[]> {
    const query = `
      SELECT 
        table_schema as schema,
        table_name as name,
        view_definition as definition
      FROM information_schema.views
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY table_schema, table_name;
    `;

    const result = await pool.query(query);

    // Get owners separately
    const ownersQuery = `
      SELECT 
        n.nspname as schema,
        c.relname as name,
        pg_get_userbyid(c.relowner) as owner
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relkind = 'v'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast');
    `;

    const ownersResult = await pool.query(ownersQuery);
    const ownersMap = new Map<string, string>();
    for (const row of ownersResult.rows) {
      ownersMap.set(`${row.schema}.${row.name}`, row.owner);
    }

    return result.rows.map((row) => ({
      schema: row.schema,
      name: row.name,
      definition: row.definition,
      owner: ownersMap.get(`${row.schema}.${row.name}`) || 'postgres',
    }));
  }

  /**
   * Extract triggers
   */
  private async extractTriggers(pool: Pool): Promise<Trigger[]> {
    const query = `
      SELECT
        trigger_schema as schema,
        event_object_table as table_name,
        trigger_name as name,
        action_timing as timing,
        event_manipulation as event,
        action_statement as function_call,
        action_condition as condition
      FROM information_schema.triggers
      WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
      ORDER BY trigger_schema, event_object_table, trigger_name;
    `;

    const result = await pool.query(query);

    // Parse function name from action_statement
    const triggers: Trigger[] = [];
    for (const row of result.rows) {
      const functionCall = row.function_call || '';
      const functionMatch = functionCall.match(/EXECUTE\s+FUNCTION\s+([^(]+)\(/i) ||
        functionCall.match(/EXECUTE\s+PROCEDURE\s+([^(]+)\(/i);
      
      let functionSchema = 'public';
      let functionName = '';
      
      if (functionMatch) {
        const fullName = functionMatch[1].trim().replace(/"/g, '');
        if (fullName.includes('.')) {
          const parts = fullName.split('.');
          functionSchema = parts[0];
          functionName = parts[1];
        } else {
          functionName = fullName;
        }
      }

      triggers.push({
        schema: row.schema,
        tableName: row.table_name,
        name: row.name,
        timing: row.timing,
        events: [row.event],
        functionSchema,
        functionName,
        condition: row.condition,
      });
    }

    return triggers;
  }

  /**
   * Extract comments
   */
  private async extractComments(pool: Pool): Promise<Comment[]> {
    const query = `
      SELECT
        n.nspname as schema,
        CASE c.relkind
          WHEN 'r' THEN 'TABLE'
          WHEN 'v' THEN 'VIEW'
          WHEN 'S' THEN 'SEQUENCE'
          WHEN 'f' THEN 'FUNCTION'
          ELSE 'TABLE'
        END as object_type,
        c.relname as object_name,
        a.attname as column_name,
        d.description as comment
      FROM pg_description d
      JOIN pg_class c ON d.objoid = c.oid
      LEFT JOIN pg_attribute a ON d.objoid = a.attrelid AND d.objsubid = a.attnum
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND d.description IS NOT NULL
        AND (a.attname IS NULL OR a.attnum > 0) -- Exclude system columns
      ORDER BY n.nspname, c.relname, a.attname;
    `;

    const result = await pool.query(query);
    return result.rows.map((row) => ({
      schema: row.schema,
      objectType: row.object_type,
      objectName: row.object_name,
      columnName: row.column_name || undefined,
      comment: row.comment,
    }));
  }

  /**
   * Extract grants
   */
  private async extractGrants(pool: Pool): Promise<Grant[]> {
    // Query for tables and sequences (using relacl)
    const tablesSequencesQuery = `
      SELECT
        n.nspname as schema,
        CASE c.relkind
          WHEN 'r' THEN 'TABLE'
          WHEN 'S' THEN 'SEQUENCE'
          ELSE 'TABLE'
        END as object_type,
        c.relname as object_name,
        c.relacl::text as acl
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND c.relkind IN ('r', 'S')
        AND c.relacl IS NOT NULL;
    `;

    // Query for functions (using proacl)
    const functionsQuery = `
      SELECT
        n.nspname as schema,
        'FUNCTION' as object_type,
        p.proname || '(' || pg_get_function_arguments(p.oid) || ')' as object_name,
        p.proacl::text as acl
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND p.prokind IN ('f', 'p')
        AND p.proacl IS NOT NULL;
    `;

    // Query for schema grants (using nspacl)
    const schemasQuery = `
      SELECT
        n.nspname as schema,
        'SCHEMA' as object_type,
        n.nspname as object_name,
        n.nspacl::text as acl
      FROM pg_namespace n
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND n.nspacl IS NOT NULL;
    `;

    const [tablesResult, functionsResult, schemasResult] = await Promise.all([
      pool.query(tablesSequencesQuery),
      pool.query(functionsQuery),
      pool.query(schemasQuery),
    ]);

    const grants: Grant[] = [];

    // Helper function to parse ACL and add grants
    const parseAcl = (
      acl: string,
      schema: string,
      objectType: 'TABLE' | 'SEQUENCE' | 'FUNCTION' | 'SCHEMA',
      objectName: string,
    ) => {
      if (!acl) return;

      // ACL format: {grantee=privileges/grantor} or multiple entries separated by commas
      // Remove curly braces if present
      const cleanAcl = acl.replace(/[{}]/g, '');
      const aclEntries = cleanAcl.split(',');

      for (const entry of aclEntries) {
        // Match format: grantee=privileges/grantor
        // Privileges: r=SELECT, w=UPDATE, a=INSERT, d=DELETE, x=EXECUTE, *=ALL
        const match = entry.match(/([^=]+)=([^\/]+)\/(.+)/);
        if (match) {
          const grantee = match[1].trim();
          const privileges = match[2].trim();
          // const grantor = match[3].trim(); // Not needed for GRANT statements

          // Map ACL privileges to SQL GRANT statements
          if (privileges.includes('r') || privileges.includes('*')) {
            grants.push({
              schema,
              objectType,
              objectName,
              grantee,
              privilege: 'SELECT',
            });
          }
          if (privileges.includes('w') || privileges.includes('*')) {
            grants.push({
              schema,
              objectType,
              objectName,
              grantee,
              privilege: 'UPDATE',
            });
          }
          if (privileges.includes('a') || privileges.includes('*')) {
            grants.push({
              schema,
              objectType,
              objectName,
              grantee,
              privilege: 'INSERT',
            });
          }
          if (privileges.includes('d') || privileges.includes('*')) {
            grants.push({
              schema,
              objectType,
              objectName,
              grantee,
              privilege: 'DELETE',
            });
          }
          if (privileges.includes('x') || privileges.includes('*')) {
            if (objectType === 'FUNCTION') {
              grants.push({
                schema,
                objectType,
                objectName,
                grantee,
                privilege: 'EXECUTE',
              });
            }
          }
        }
      }
    };

    // Process all results with proper type casting
    for (const row of tablesResult.rows) {
      parseAcl(
        row.acl,
        row.schema,
        row.object_type as 'TABLE' | 'SEQUENCE',
        row.object_name,
      );
    }

    for (const row of functionsResult.rows) {
      parseAcl(row.acl, row.schema, 'FUNCTION', row.object_name);
    }

    for (const row of schemasResult.rows) {
      parseAcl(row.acl, row.schema, 'SCHEMA', row.object_name);
    }

    return grants;
  }

  /**
   * Generate SQL dump from components
   */
  private generateSQL(
    components: SchemaComponents,
    options: SchemaDumpOptions = {},
  ): string {
    const {
      includeDrops = true,
      includeGrants = true,
      includeComments = true,
    } = options;

    const lines: string[] = [];

    // Header
    lines.push('-- ============================================');
    lines.push('-- Database Schema Dump');
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push('-- ============================================');
    lines.push('');
    lines.push('BEGIN;');
    lines.push('');

    // Extensions (must be first)
    if (components.extensions.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- EXTENSIONS');
      lines.push('-- ============================================');
      for (const ext of components.extensions) {
        lines.push(
          `CREATE EXTENSION IF NOT EXISTS "${ext.name}" WITH SCHEMA "${ext.schema}";`,
        );
      }
      lines.push('');
    }

    // Schemas
    if (components.schemas.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- SCHEMAS');
      lines.push('-- ============================================');
      for (const schema of components.schemas) {
        lines.push(`CREATE SCHEMA IF NOT EXISTS "${schema.name}";`);
      }
      lines.push('');
    }

    // Enum Types (must be before tables that use them)
    if (components.enums.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- ENUM TYPES');
      lines.push('-- ============================================');
      if (includeDrops) {
        for (const enumType of components.enums) {
          lines.push(
            `DROP TYPE IF EXISTS "${enumType.schema}"."${enumType.name}" CASCADE;`,
          );
        }
        lines.push('');
      }
      for (const enumType of components.enums) {
        const values = enumType.values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ');
        lines.push(
          `CREATE TYPE "${enumType.schema}"."${enumType.name}" AS ENUM (${values});`,
        );
      }
      lines.push('');
    }

    // Sequences
    if (components.sequences.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- SEQUENCES');
      lines.push('-- ============================================');
      if (includeDrops) {
        for (const seq of components.sequences) {
          lines.push(
            `DROP SEQUENCE IF EXISTS "${seq.schema}"."${seq.name}" CASCADE;`,
          );
        }
        lines.push('');
      }
      for (const seq of components.sequences) {
        lines.push(
          `CREATE SEQUENCE IF NOT EXISTS "${seq.schema}"."${seq.name}"`,
        );
        lines.push(`    AS ${seq.dataType}`);
        lines.push(`    START WITH ${seq.startValue}`);
        lines.push(`    INCREMENT BY ${seq.increment}`);
        if (seq.minValue !== null) {
          lines.push(`    MINVALUE ${seq.minValue}`);
        } else {
          lines.push(`    NO MINVALUE`);
        }
        if (seq.maxValue !== null) {
          lines.push(`    MAXVALUE ${seq.maxValue}`);
        } else {
          lines.push(`    NO MAXVALUE`);
        }
        lines.push(`    CACHE ${seq.cacheSize}`);
        if (seq.cycle) {
          lines.push(`    CYCLE`);
        } else {
          lines.push(`    NO CYCLE`);
        }
        lines.push(';');
        lines.push('');
      }
    }

    // Functions
    if (components.functions.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- FUNCTIONS');
      lines.push('-- ============================================');
      if (includeDrops) {
        for (const func of components.functions) {
          lines.push(
            `DROP FUNCTION IF EXISTS "${func.schema}"."${func.name}"(${func.parameters}) CASCADE;`,
          );
        }
        lines.push('');
      }
      for (const func of components.functions) {
        // Use the full definition from pg_get_functiondef
        lines.push(func.definition);
        lines.push('');
      }
    }

    // Tables
    if (components.tables.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- TABLES');
      lines.push('-- ============================================');
      if (includeDrops) {
        // Drop in reverse order to handle dependencies
        for (let i = components.tables.length - 1; i >= 0; i--) {
          const table = components.tables[i];
          lines.push(
            `DROP TABLE IF EXISTS "${table.schema}"."${table.name}" CASCADE;`,
          );
        }
        lines.push('');
      }

      for (const table of components.tables) {
        lines.push(
          `CREATE TABLE "${table.schema}"."${table.name}" (`,
        );

        const columnDefs: string[] = [];
        for (const column of table.columns) {
          let def = `    "${column.name}" ${this.formatDataType(column)}`;
          if (!column.isNullable) {
            def += ' NOT NULL';
          }
          if (column.defaultValue) {
            def += ` DEFAULT ${column.defaultValue}`;
          }
          columnDefs.push(def);
        }

        // Add primary key and unique constraints inline if single column
        for (const constraint of table.constraints) {
          if (constraint.type === 'PRIMARY KEY' && constraint.columns?.length === 1) {
            const col = columnDefs.find((c) =>
              c.includes(`"${constraint.columns[0]}"`),
            );
            if (col) {
              columnDefs[
                columnDefs.indexOf(col)
              ] = col.replace(' NOT NULL', ' NOT NULL PRIMARY KEY');
            }
          } else if (
            constraint.type === 'UNIQUE' &&
            constraint.columns?.length === 1
          ) {
            const col = columnDefs.find((c) =>
              c.includes(`"${constraint.columns[0]}"`),
            );
            if (col) {
              columnDefs[columnDefs.indexOf(col)] = col + ' UNIQUE';
            }
          }
        }

        lines.push(columnDefs.join(',\n'));

        // Add multi-column constraints
        const tableConstraints: string[] = [];
        for (const constraint of table.constraints) {
          if (
            constraint.type === 'PRIMARY KEY' &&
            constraint.columns &&
            constraint.columns.length > 1
          ) {
            tableConstraints.push(
              `    CONSTRAINT "${constraint.name}" PRIMARY KEY (${constraint.columns.map((c) => `"${c}"`).join(', ')})`,
            );
          } else if (
            constraint.type === 'UNIQUE' &&
            constraint.columns &&
            constraint.columns.length > 1
          ) {
            tableConstraints.push(
              `    CONSTRAINT "${constraint.name}" UNIQUE (${constraint.columns.map((c) => `"${c}"`).join(', ')})`,
            );
          } else if (constraint.type === 'CHECK' && constraint.definition) {
            tableConstraints.push(
              `    CONSTRAINT "${constraint.name}" CHECK (${constraint.definition})`,
            );
          }
        }

        if (tableConstraints.length > 0) {
          lines.push(',');
          lines.push(tableConstraints.join(',\n'));
        }

        lines.push(');');
        lines.push('');
      }
    }

    // Indexes
    if (components.indexes.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- INDEXES');
      lines.push('-- ============================================');
      if (includeDrops) {
        for (const index of components.indexes) {
          lines.push(
            `DROP INDEX IF EXISTS "${index.schema}"."${index.name}";`,
          );
        }
        lines.push('');
      }
      for (const index of components.indexes) {
        lines.push(index.definition + ';');
        lines.push('');
      }
    }

    // Foreign Keys
    if (components.foreignKeys.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- FOREIGN KEYS');
      lines.push('-- ============================================');
      // Group by table
      const fkByTable = new Map<string, ForeignKey[]>();
      for (const fk of components.foreignKeys) {
        const key = `${fk.schema}.${fk.tableName}`;
        if (!fkByTable.has(key)) {
          fkByTable.set(key, []);
        }
        fkByTable.get(key)!.push(fk);
      }

      for (const [tableKey, fks] of fkByTable.entries()) {
        const [schema, tableName] = tableKey.split('.');
        for (const fk of fks) {
          lines.push(
            `ALTER TABLE "${schema}"."${tableName}"`,
          );
          lines.push(
            `    ADD CONSTRAINT "${fk.constraintName}"`,
          );
          lines.push(
            `    FOREIGN KEY ("${fk.columnName}")`,
          );
          lines.push(
            `    REFERENCES "${fk.foreignTableSchema}"."${fk.foreignTableName}" ("${fk.foreignColumnName}")`,
          );
          if (fk.onDelete !== 'NO ACTION') {
            lines.push(`    ON DELETE ${fk.onDelete}`);
          }
          if (fk.onUpdate !== 'NO ACTION') {
            lines.push(`    ON UPDATE ${fk.onUpdate}`);
          }
          lines.push(';');
          lines.push('');
        }
      }
    }

    // Views
    if (components.views.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- VIEWS');
      lines.push('-- ============================================');
      if (includeDrops) {
        for (const view of components.views) {
          lines.push(
            `DROP VIEW IF EXISTS "${view.schema}"."${view.name}" CASCADE;`,
          );
        }
        lines.push('');
      }
      for (const view of components.views) {
        lines.push(
          `CREATE OR REPLACE VIEW "${view.schema}"."${view.name}" AS`,
        );
        lines.push(view.definition);
        lines.push(';');
        lines.push('');
      }
    }

    // Triggers
    if (components.triggers.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- TRIGGERS');
      lines.push('-- ============================================');
      if (includeDrops) {
        for (const trigger of components.triggers) {
          lines.push(
            `DROP TRIGGER IF EXISTS "${trigger.name}" ON "${trigger.schema}"."${trigger.tableName}";`,
          );
        }
        lines.push('');
      }
      for (const trigger of components.triggers) {
        lines.push(
          `CREATE TRIGGER "${trigger.name}"`,
        );
        lines.push(`    ${trigger.timing} ${trigger.events.join(' OR ')}`);
        lines.push(`    ON "${trigger.schema}"."${trigger.tableName}"`);
        if (trigger.condition) {
          lines.push(`    FOR EACH ROW WHEN (${trigger.condition})`);
        } else {
          lines.push('    FOR EACH ROW');
        }
        lines.push(
          `    EXECUTE FUNCTION "${trigger.functionSchema}"."${trigger.functionName}"();`,
        );
        lines.push('');
      }
    }

    // Comments
    if (includeComments && components.comments.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- COMMENTS');
      lines.push('-- ============================================');
      for (const comment of components.comments) {
        const escapedComment = comment.comment.replace(/'/g, "''");
        if (comment.columnName) {
          lines.push(
            `COMMENT ON COLUMN "${comment.schema}"."${comment.objectName}"."${comment.columnName}" IS '${escapedComment}';`,
          );
        } else {
          lines.push(
            `COMMENT ON ${comment.objectType} "${comment.schema}"."${comment.objectName}" IS '${escapedComment}';`,
          );
        }
      }
      lines.push('');
    }

    // Grants
    if (includeGrants && components.grants.length > 0) {
      lines.push('-- ============================================');
      lines.push('-- GRANTS');
      lines.push('-- ============================================');
      for (const grant of components.grants) {
        if (grant.objectType === 'SCHEMA') {
          lines.push(
            `GRANT USAGE ON SCHEMA "${grant.schema}" TO "${grant.grantee}";`,
          );
        } else {
          lines.push(
            `GRANT ${grant.privilege} ON ${grant.objectType} "${grant.schema}"."${grant.objectName}" TO "${grant.grantee}";`,
          );
        }
      }
      lines.push('');
    }

    lines.push('COMMIT;');

    return lines.join('\n');
  }

  /**
   * Format data type for column definition
   */
  private formatDataType(column: TableColumn): string {
    let type = column.dataType.toUpperCase();

    // Handle arrays - use UDT name if available
    if (type === 'ARRAY' && column.udtName) {
      // Extract base type from UDT name (e.g., _text -> text[])
      const baseType = column.udtName.replace(/^_/, '');
      return `${baseType}[]`;
    }

    // Don't add precision/scale for INTEGER types
    const integerTypes = ['INTEGER', 'INT', 'BIGINT', 'SMALLINT'];
    if (integerTypes.includes(type)) {
      return type;
    }

    // Add length for character types
    if (column.characterMaximumLength) {
      type += `(${column.characterMaximumLength})`;
    } 
    // Add precision/scale for numeric types (but not integers)
    else if (
      column.numericPrecision !== null &&
      column.numericScale !== null &&
      column.numericScale !== 0
    ) {
      type += `(${column.numericPrecision},${column.numericScale})`;
    } else if (
      column.numericPrecision !== null &&
      column.numericScale === 0 &&
      !integerTypes.includes(type)
    ) {
      // Only add precision if scale is 0 and it's not an integer type
      type += `(${column.numericPrecision})`;
    }

    return type;
  }
}

