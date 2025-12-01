import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { Schema, Table, Column, Index, ForeignKey, DatabaseStats, DatabaseFunction, DatabaseView, DatabaseIndex, FunctionCategory, FunctionDetails, ViewDetails, IndexDetails, DatabaseEnum, EnumDetails } from './interfaces/schema.interface';

@Injectable()
export class SchemasService {
  private readonly logger = new Logger(SchemasService.name);

  constructor(private readonly connectionManager: ConnectionManagerService) {}

  /**
   * Get all schemas for a connection
   */
  async getSchemas(connectionId: string): Promise<Schema[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    const query = `
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name;
    `;

    try {
      const result = await pool.query(query);
      return result.rows.map((row) => ({
        name: row.schema_name,
      }));
    } catch (error) {
      this.logger.error(`Failed to get schemas for connection ${connectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all tables for a connection (optionally filtered by schema)
   */
  async getTables(connectionId: string, schema?: string): Promise<Table[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    let query = `
      SELECT 
        t.table_schema,
        t.table_name,
        pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name)) as size_bytes
      FROM information_schema.tables t
      WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    `;

    const params: any[] = [];
    if (schema) {
      query += ` AND t.table_schema = $1`;
      params.push(schema);
    }

    query += ` ORDER BY t.table_schema, t.table_name;`;

    try {
      const result = await pool.query(query, params);
      const tables: Table[] = [];

      for (const row of result.rows) {
        const tableName = row.table_name;
        const tableSchema = row.table_schema;
        const sizeBytes = parseInt(row.size_bytes) || 0;

        // Get row count
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM ${this.quoteIdentifier(tableSchema)}.${this.quoteIdentifier(tableName)};`,
        );
        const rowCount = parseInt(countResult.rows[0].count) || 0;

        // Get columns, indexes, and foreign keys
        const [columns, indexes, foreignKeys] = await Promise.all([
          this.getColumns(connectionId, tableSchema, tableName),
          this.getTableIndexes(connectionId, tableSchema, tableName),
          this.getForeignKeys(connectionId, tableSchema, tableName),
        ]);

        tables.push({
          id: `${tableSchema}.${tableName}`,
          name: tableName,
          schema: tableSchema,
          rowCount,
          size: this.formatSize(sizeBytes),
          sizeBytes,
          columns,
          indexes,
          foreignKeys,
        });
      }

      return tables;
    } catch (error) {
      this.logger.error(`Failed to get tables for connection ${connectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed table information
   */
  async getTableDetails(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<Table> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    try {
      // First check if table exists
      const tableExistsResult = await pool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        ) as exists;`,
        [schema, table],
      );

      if (!tableExistsResult.rows[0].exists) {
        throw new NotFoundException(`Table ${schema}.${table} not found`);
      }

      // Get table size
      const sizeResult = await pool.query(
        `SELECT pg_total_relation_size($1) as size_bytes;`,
        [`${schema}.${table}`],
      );
      const sizeBytes = parseInt(sizeResult.rows[0].size_bytes) || 0;

      // Get row count
      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM ${this.quoteIdentifier(schema)}.${this.quoteIdentifier(table)};`,
      );
      const rowCount = parseInt(countResult.rows[0].count) || 0;

        // Get columns, indexes, and foreign keys
        const [columns, indexes, foreignKeys] = await Promise.all([
          this.getColumns(connectionId, schema, table),
          this.getTableIndexes(connectionId, schema, table),
          this.getForeignKeys(connectionId, schema, table),
        ]);

      return {
        id: `${schema}.${table}`,
        name: table,
        schema,
        rowCount,
        size: this.formatSize(sizeBytes),
        sizeBytes,
        columns,
        indexes,
        foreignKeys,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get table details for ${schema}.${table}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(connectionId: string): Promise<DatabaseStats> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    try {
      // Get schema count
      const schemaResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
      `);
      const schemaCount = parseInt(schemaResult.rows[0].count) || 0;

      // Get table count and total size
      const tableResult = await pool.query(`
        SELECT 
          COUNT(*) as table_count,
          SUM(pg_total_relation_size(quote_ident(table_schema) || '.' || quote_ident(table_name))) as total_size
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
      `);
      const tableCount = parseInt(tableResult.rows[0].table_count) || 0;
      const totalSizeBytes = parseInt(tableResult.rows[0].total_size) || 0;

      // Get total row count (approximate for performance)
      const rowCountResult = await pool.query(`
        SELECT SUM(n_live_tup) as total_rows
        FROM pg_stat_user_tables;
      `);
      const totalRows = parseInt(rowCountResult.rows[0]?.total_rows) || 0;

      return {
        schemaCount,
        tableCount,
        totalRows,
        totalSize: this.formatSize(totalSizeBytes),
        totalSizeBytes,
      };
    } catch (error) {
      this.logger.error(`Failed to get database stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get columns for a table
   */
  private async getColumns(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<Column[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      return [];
    }

    // Get primary keys
    const pkResult = await pool.query(
      `
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass
        AND i.indisprimary;
    `,
      [`${schema}.${table}`],
    );
    const primaryKeys = new Set(pkResult.rows.map((r) => r.attname));

    // Get columns with metadata
    const result = await pool.query(
      `
      SELECT 
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.is_nullable,
        c.column_default,
        c.udt_name
      FROM information_schema.columns c
      WHERE c.table_schema = $1
        AND c.table_name = $2
      ORDER BY c.ordinal_position;
    `,
      [schema, table],
    );

    // Get foreign key columns
    const fkResult = await pool.query(
      `
      SELECT
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2;
    `,
      [schema, table],
    );
    const foreignKeyColumns = new Set(fkResult.rows.map((r) => r.column_name));

    return result.rows.map((row) => {
      const columnName = row.column_name;
      const isPrimaryKey = primaryKeys.has(columnName);
      const isForeignKey = foreignKeyColumns.has(columnName);

      // Format data type
      let dataType = row.data_type;
      if (row.character_maximum_length) {
        dataType += `(${row.character_maximum_length})`;
      } else if (row.numeric_precision) {
        if (row.numeric_scale) {
          dataType += `(${row.numeric_precision},${row.numeric_scale})`;
        } else {
          dataType += `(${row.numeric_precision})`;
        }
      } else if (row.udt_name && row.udt_name !== row.data_type) {
        dataType = row.udt_name;
      }

      return {
        name: columnName,
        type: dataType,
        nullable: row.is_nullable === 'YES',
        defaultValue: row.column_default || undefined,
        isPrimaryKey,
        isForeignKey,
      };
    });
  }

  /**
   * Get indexes for a table
   */
  private async getTableIndexes(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<Index[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      return [];
    }

    const result = await pool.query(
      `
      SELECT
        i.indexname,
        i.indexdef,
        idx.indisunique,
        am.amname as index_type
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.indexname
      JOIN pg_index idx ON idx.indexrelid = c.oid
      JOIN pg_am am ON am.oid = c.relam
      WHERE i.schemaname = $1
        AND i.tablename = $2
        AND idx.indisprimary = false
      ORDER BY i.indexname;
    `,
      [schema, table],
    );

    // Extract column names from index definition
    return result.rows.map((row) => {
      const match = row.indexdef.match(/\(([^)]+)\)/);
      const columns = match
        ? match[1].split(',').map((col) => col.trim().replace(/"/g, ''))
        : [];

      return {
        name: row.indexname,
        type: row.index_type || 'btree',
        columns,
        unique: row.indisunique || false,
      };
    });
  }

  /**
   * Get foreign keys for a table
   */
  private async getForeignKeys(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<ForeignKey[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      return [];
    }

    const result = await pool.query(
      `
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
      ORDER BY tc.constraint_name, kcu.ordinal_position;
    `,
      [schema, table],
    );

    // Group by constraint name
    const fkMap = new Map<string, ForeignKey>();
    for (const row of result.rows) {
      const constraintName = row.constraint_name;
      if (!fkMap.has(constraintName)) {
        fkMap.set(constraintName, {
          name: constraintName,
          columns: [],
          referencedTable: row.foreign_table_name,
          referencedSchema: row.foreign_table_schema,
          referencedColumns: [],
        });
      }

      const fk = fkMap.get(constraintName)!;
      if (!fk.columns.includes(row.column_name)) {
        fk.columns.push(row.column_name);
      }
      if (!fk.referencedColumns.includes(row.foreign_column_name)) {
        fk.referencedColumns.push(row.foreign_column_name);
      }
    }

    return Array.from(fkMap.values());
  }

  /**
   * Get all functions for a connection (optionally filtered by schema and category)
   */
  async getFunctions(
    connectionId: string,
    schema?: string,
    category?: 'user' | 'extension' | 'system',
  ): Promise<DatabaseFunction[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    let query = `
      SELECT 
        n.nspname as schema,
        p.proname as name,
        l.lanname as language,
        pg_get_function_result(p.oid) as return_type,
        pg_get_function_arguments(p.oid) as parameters,
        pg_get_userbyid(p.proowner) as owner,
        CASE 
          WHEN n.nspname IN ('pg_catalog', 'information_schema') THEN 'system'
          WHEN ext.extname IS NOT NULL THEN 'extension'
          ELSE 'user'
        END as category,
        ext.extname as extension_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
      LEFT JOIN pg_extension ext ON ext.oid = d.refobjid
      WHERE p.prokind IN ('f', 'p')
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by schema
    if (schema) {
      query += ` AND n.nspname = $${paramIndex}`;
      params.push(schema);
      paramIndex++;
    } else {
      // If no schema filter, exclude system schemas by default unless category is 'system'
      if (category !== 'system') {
        query += ` AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`;
      }
    }

    // Filter by category
    if (category) {
      if (category === 'system') {
        query += ` AND n.nspname IN ('pg_catalog', 'information_schema')`;
      } else if (category === 'extension') {
        query += ` AND ext.extname IS NOT NULL AND n.nspname NOT IN ('pg_catalog', 'information_schema')`;
      } else if (category === 'user') {
        query += ` AND ext.extname IS NULL AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')`;
      }
    }

    query += ` ORDER BY n.nspname, p.proname, pg_get_function_arguments(p.oid);`;

    try {
      const result = await pool.query(query, params);
      return result.rows.map((row) => ({
        id: `${row.schema}.${row.name}(${row.parameters || ''})`,
        name: row.name,
        schema: row.schema,
        language: row.language,
        returnType: row.return_type,
        parameters: row.parameters || '',
        owner: row.owner,
        category: row.category as 'user' | 'extension' | 'system',
        extensionName: row.extension_name || undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to get functions for connection ${connectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all views for a connection (optionally filtered by schema)
   */
  async getViews(connectionId: string, schema?: string): Promise<DatabaseView[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    let query = `
      SELECT 
        v.table_schema as schema,
        v.table_name as name,
        pg_get_userbyid(c.relowner) as owner
      FROM information_schema.views v
      JOIN pg_class c ON c.relname = v.table_name
      JOIN pg_namespace n ON n.nspname = v.table_schema AND n.oid = c.relnamespace
      WHERE v.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    `;

    const params: any[] = [];
    if (schema) {
      query += ` AND v.table_schema = $1`;
      params.push(schema);
    }

    query += ` ORDER BY v.table_schema, v.table_name;`;

    try {
      const result = await pool.query(query, params);
      return result.rows.map((row) => ({
        id: `${row.schema}.${row.name}`,
        name: row.name,
        schema: row.schema,
        owner: row.owner,
      }));
    } catch (error) {
      this.logger.error(`Failed to get views for connection ${connectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all indexes for a connection (optionally filtered by schema)
   * This includes both table indexes and standalone indexes
   */
  async getIndexes(connectionId: string, schema?: string): Promise<DatabaseIndex[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    let query = `
      SELECT
        i.schemaname as schema,
        i.schemaname as table_schema,
        i.tablename as table_name,
        i.indexname as name,
        idx.indisunique as is_unique,
        am.amname as index_type,
        i.indexdef as definition
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.indexname
      JOIN pg_namespace n ON n.nspname = i.schemaname AND n.oid = c.relnamespace
      JOIN pg_index idx ON idx.indexrelid = c.oid
      JOIN pg_am am ON am.oid = c.relam
      WHERE i.schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND idx.indisprimary = false
    `;

    const params: any[] = [];
    if (schema) {
      query += ` AND i.schemaname = $1`;
      params.push(schema);
    }

    query += ` ORDER BY i.schemaname, i.tablename, i.indexname;`;

    try {
      const result = await pool.query(query, params);
      return result.rows.map((row) => {
        // Extract column names from index definition
        const match = row.definition.match(/\(([^)]+)\)/);
        const columns = match
          ? match[1].split(',').map((col) => col.trim().replace(/"/g, ''))
          : [];

        return {
          id: `${row.schema}.${row.name}`,
          name: row.name,
          schema: row.schema,
          tableSchema: row.table_schema,
          tableName: row.table_name,
          type: row.index_type || 'btree',
          unique: row.is_unique || false,
          columns,
        };
      });
    } catch (error) {
      this.logger.error(`Failed to get indexes for connection ${connectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed function information
   */
  async getFunctionDetails(
    connectionId: string,
    schema: string,
    functionName: string,
    parameters?: string,
  ): Promise<FunctionDetails> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    let query = `
      SELECT 
        n.nspname as schema,
        p.proname as name,
        pg_get_functiondef(p.oid) as definition,
        l.lanname as language,
        pg_get_function_result(p.oid) as return_type,
        pg_get_function_arguments(p.oid) as parameters,
        pg_get_userbyid(p.proowner) as owner,
        CASE 
          WHEN n.nspname IN ('pg_catalog', 'information_schema') THEN 'system'
          WHEN ext.extname IS NOT NULL THEN 'extension'
          ELSE 'user'
        END as category,
        ext.extname as extension_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
      LEFT JOIN pg_extension ext ON ext.oid = d.refobjid
      WHERE n.nspname = $1
        AND p.proname = $2
        AND p.prokind IN ('f', 'p')
    `;

    const params: any[] = [schema, functionName];
    if (parameters) {
      query += ` AND pg_get_function_arguments(p.oid) = $3`;
      params.push(parameters);
    }

    query += ` ORDER BY p.oid LIMIT 1;`;

    try {
      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        throw new NotFoundException(`Function ${schema}.${functionName} not found`);
      }

      const row = result.rows[0];
      return {
        id: `${row.schema}.${row.name}(${row.parameters || ''})`,
        name: row.name,
        schema: row.schema,
        language: row.language,
        returnType: row.return_type,
        parameters: row.parameters || '',
        owner: row.owner,
        category: row.category as FunctionCategory,
        extensionName: row.extension_name || undefined,
        definition: row.definition,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get function details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed view information
   */
  async getViewDetails(
    connectionId: string,
    schema: string,
    viewName: string,
  ): Promise<ViewDetails> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    const query = `
      SELECT 
        v.table_schema as schema,
        v.table_name as name,
        v.view_definition as definition,
        pg_get_userbyid(c.relowner) as owner
      FROM information_schema.views v
      JOIN pg_class c ON c.relname = v.table_name
      JOIN pg_namespace n ON n.nspname = v.table_schema AND n.oid = c.relnamespace
      WHERE v.table_schema = $1
        AND v.table_name = $2
      LIMIT 1;
    `;

    try {
      const result = await pool.query(query, [schema, viewName]);
      if (result.rows.length === 0) {
        throw new NotFoundException(`View ${schema}.${viewName} not found`);
      }

      const row = result.rows[0];
      return {
        id: `${row.schema}.${row.name}`,
        name: row.name,
        schema: row.schema,
        owner: row.owner,
        definition: row.definition,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get view details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed index information
   */
  async getIndexDetails(
    connectionId: string,
    schema: string,
    indexName: string,
  ): Promise<IndexDetails> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    const query = `
      SELECT
        i.schemaname as schema,
        i.tablename as table_name,
        i.indexname as name,
        i.indexdef as definition,
        idx.indisunique as is_unique,
        am.amname as index_type,
        pg_relation_size(c.oid) as size_bytes,
        COALESCE(stat.idx_scan, 0) as index_scans
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.indexname
      JOIN pg_namespace n ON n.nspname = i.schemaname AND n.oid = c.relnamespace
      JOIN pg_index idx ON idx.indexrelid = c.oid
      JOIN pg_am am ON am.oid = c.relam
      LEFT JOIN pg_stat_user_indexes stat ON stat.indexrelid = c.oid
      WHERE i.schemaname = $1
        AND i.indexname = $2
      LIMIT 1;
    `;

    try {
      const result = await pool.query(query, [schema, indexName]);
      if (result.rows.length === 0) {
        throw new NotFoundException(`Index ${schema}.${indexName} not found`);
      }

      const row = result.rows[0];
      const match = row.definition.match(/\(([^)]+)\)/);
      const columns = match
        ? match[1].split(',').map((col) => col.trim().replace(/"/g, ''))
        : [];

      const sizeBytes = parseInt(row.size_bytes) || 0;

      return {
        id: `${row.schema}.${row.name}`,
        name: row.name,
        schema: row.schema,
        tableSchema: row.schema,
        tableName: row.table_name,
        type: row.index_type || 'btree',
        unique: row.is_unique || false,
        columns,
        definition: row.definition,
        size: this.formatSize(sizeBytes),
        sizeBytes,
        isUsed: (row.index_scans || 0) > 0,
        indexScans: parseInt(row.index_scans) || 0,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get index details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all enums for a connection (optionally filtered by schema)
   */
  async getEnums(connectionId: string, schema?: string): Promise<DatabaseEnum[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    let query = `
      SELECT 
        n.nspname as schema,
        t.typname as name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder)::text[] as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        AND t.typtype = 'e'
    `;

    const params: any[] = [];
    if (schema) {
      query += ` AND n.nspname = $1`;
      params.push(schema);
    }

    query += ` GROUP BY n.nspname, t.typname ORDER BY n.nspname, t.typname;`;

    try {
      const result = await pool.query(query, params);
      return result.rows.map((row) => ({
        id: `${row.schema}.${row.name}`,
        name: row.name,
        schema: row.schema,
        values: Array.isArray(row.values) ? row.values : [],
      }));
    } catch (error) {
      this.logger.error(`Failed to get enums for connection ${connectionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get detailed enum information
   */
  async getEnumDetails(
    connectionId: string,
    schema: string,
    enumName: string,
  ): Promise<EnumDetails> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    // Get enum values
    const enumQuery = `
      SELECT 
        n.nspname as schema,
        t.typname as name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder)::text[] as values,
        pg_get_userbyid(t.typowner) as owner
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = $1
        AND t.typname = $2
        AND t.typtype = 'e'
      GROUP BY n.nspname, t.typname, t.typowner;
    `;

    try {
      const enumResult = await pool.query(enumQuery, [schema, enumName]);
      if (enumResult.rows.length === 0) {
        throw new NotFoundException(`Enum ${schema}.${enumName} not found`);
      }

      const row = enumResult.rows[0];

      // Find where this enum is used
      const usageQuery = `
        SELECT 
          table_schema,
          table_name,
          column_name
        FROM information_schema.columns
        WHERE udt_name = $1
          AND table_schema = $2
        ORDER BY table_schema, table_name, column_name;
      `;

      const usageResult = await pool.query(usageQuery, [enumName, schema]);
      const usedInTables = usageResult.rows.map((r) => ({
        tableSchema: r.table_schema,
        tableName: r.table_name,
        columnName: r.column_name,
      }));

      return {
        id: `${row.schema}.${row.name}`,
        name: row.name,
        schema: row.schema,
        values: Array.isArray(row.values) ? row.values : [],
        owner: row.owner,
        usedInTables,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get enum details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format bytes to human-readable size
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Quote identifier for SQL (prevent injection)
   */
  private quoteIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  /**
   * Check dependencies for a table
   */
  async checkTableDependencies(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<{
    hasDependencies: boolean;
    dependentTables: Array<{ schema: string; table: string; constraint: string }>;
  }> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    try {
      // Check for foreign keys that reference this table
      const query = `
        SELECT
          tc.table_schema,
          tc.table_name,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = $1
          AND ccu.table_name = $2
      `;

      const result = await pool.query(query, [schema, table]);
      const dependentTables = result.rows.map((row) => ({
        schema: row.table_schema,
        table: row.table_name,
        constraint: row.constraint_name,
      }));

      return {
        hasDependencies: dependentTables.length > 0,
        dependentTables,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to check dependencies for ${schema}.${table}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Check dependencies for a schema
   */
  async checkSchemaDependencies(
    connectionId: string,
    schema: string,
  ): Promise<{
    hasDependencies: boolean;
    objects: Array<{ type: string; name: string }>;
    dependentSchemas: string[];
  }> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    try {
      // Check for objects in schema
      const objectsQuery = `
        SELECT 
          'table' as type,
          table_name as name
        FROM information_schema.tables
        WHERE table_schema = $1
        UNION ALL
        SELECT 
          'view' as type,
          table_name as name
        FROM information_schema.views
        WHERE table_schema = $1
        UNION ALL
        SELECT 
          'sequence' as type,
          sequence_name as name
        FROM information_schema.sequences
        WHERE sequence_schema = $1
      `;

      const objectsResult = await pool.query(objectsQuery, [schema]);
      const objects = objectsResult.rows.map((row) => ({
        type: row.type,
        name: row.name,
      }));

      // Check for cross-schema dependencies (foreign keys from other schemas)
      const crossSchemaQuery = `
        SELECT DISTINCT tc.table_schema
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = $1
          AND tc.table_schema != $1
      `;

      const crossSchemaResult = await pool.query(crossSchemaQuery, [schema]);
      const dependentSchemas = crossSchemaResult.rows.map((row) => row.table_schema);

      return {
        hasDependencies: objects.length > 0 || dependentSchemas.length > 0,
        objects,
        dependentSchemas,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to check dependencies for schema ${schema}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Delete a table
   */
  async deleteTable(
    connectionId: string,
    schema: string,
    table: string,
    options: { cascade?: boolean; confirmName?: string } = {},
  ): Promise<{ success: boolean; message: string }> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    // Validate type-to-confirm
    if (options.confirmName && options.confirmName !== table) {
      throw new BadRequestException(
        `Confirmation name "${options.confirmName}" does not match table name "${table}"`,
      );
    }

    // Sanitize identifiers
    schema = this.sanitizeIdentifier(schema);
    table = this.sanitizeIdentifier(table);

    // Prevent deletion of system schemas
    const systemSchemas = ['information_schema', 'pg_catalog', 'pg_toast'];
    if (systemSchemas.includes(schema)) {
      throw new BadRequestException(`Cannot delete tables from system schema: ${schema}`);
    }

    try {
      // Check if table exists
      const tableExistsResult = await pool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = $1 AND table_name = $2
        ) as exists;`,
        [schema, table],
      );

      if (!tableExistsResult.rows[0].exists) {
        throw new NotFoundException(`Table ${schema}.${table} not found`);
      }

      // Check dependencies if not cascading
      if (!options.cascade) {
        const dependencies = await this.checkTableDependencies(connectionId, schema, table);
        if (dependencies.hasDependencies) {
          throw new BadRequestException(
            `Table has dependencies. Use cascade=true to delete anyway. Dependent tables: ${dependencies.dependentTables.map(d => `${d.schema}.${d.table}`).join(', ')}`,
          );
        }
      }

      // Execute DROP TABLE
      const cascadeClause = options.cascade ? ' CASCADE' : '';
      const dropQuery = `DROP TABLE ${this.quoteIdentifier(schema)}.${this.quoteIdentifier(table)}${cascadeClause};`;

      this.logger.log(`[SchemasService] Executing: ${dropQuery}`);
      await pool.query(dropQuery);

      this.logger.log(`[SchemasService] Successfully deleted table ${schema}.${table}`);

      return {
        success: true,
        message: `Table ${schema}.${table} deleted successfully`,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to delete table ${schema}.${table}: ${error.message}`,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to delete table: ${error.message}`,
      );
    }
  }

  /**
   * Delete a schema
   */
  async deleteSchema(
    connectionId: string,
    schema: string,
    options: { cascade?: boolean; confirmName?: string } = {},
  ): Promise<{ success: boolean; message: string }> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(`Connection ${connectionId} not found or not connected`);
    }

    // Validate type-to-confirm
    if (options.confirmName && options.confirmName !== schema) {
      throw new BadRequestException(
        `Confirmation name "${options.confirmName}" does not match schema name "${schema}"`,
      );
    }

    // Sanitize identifier
    schema = this.sanitizeIdentifier(schema);

    // Prevent deletion of system schemas
    const systemSchemas = ['information_schema', 'pg_catalog', 'pg_toast', 'public'];
    if (systemSchemas.includes(schema)) {
      throw new BadRequestException(`Cannot delete system schema: ${schema}`);
    }

    try {
      // Check if schema exists
      const schemaExistsResult = await pool.query(
        `SELECT EXISTS (
          SELECT 1 
          FROM information_schema.schemata 
          WHERE schema_name = $1
        ) as exists;`,
        [schema],
      );

      if (!schemaExistsResult.rows[0].exists) {
        throw new NotFoundException(`Schema ${schema} not found`);
      }

      // Check dependencies if not cascading
      if (!options.cascade) {
        const dependencies = await this.checkSchemaDependencies(connectionId, schema);
        if (dependencies.hasDependencies) {
          const objectList = dependencies.objects.map(o => `${o.type}: ${o.name}`).join(', ');
          const schemaList = dependencies.dependentSchemas.length > 0
            ? ` Dependent schemas: ${dependencies.dependentSchemas.join(', ')}`
            : '';
          throw new BadRequestException(
            `Schema has dependencies. Use cascade=true to delete anyway. Objects: ${objectList}.${schemaList}`,
          );
        }
      }

      // Execute DROP SCHEMA
      const cascadeClause = options.cascade ? ' CASCADE' : '';
      const dropQuery = `DROP SCHEMA ${this.quoteIdentifier(schema)}${cascadeClause};`;

      this.logger.log(`[SchemasService] Executing: ${dropQuery}`);
      await pool.query(dropQuery);

      this.logger.log(`[SchemasService] Successfully deleted schema ${schema}`);

      return {
        success: true,
        message: `Schema ${schema} deleted successfully`,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to delete schema ${schema}: ${error.message}`,
      );

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to delete schema: ${error.message}`,
      );
    }
  }

  /**
   * Sanitize identifier to prevent SQL injection
   */
  private sanitizeIdentifier(identifier: string): string {
    // Remove any characters that aren't alphanumeric, underscore, or dot
    return identifier.replace(/[^a-zA-Z0-9_.]/g, '');
  }
}

