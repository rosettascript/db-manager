import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { Schema, Table, Column, Index, ForeignKey, DatabaseStats } from './interfaces/schema.interface';

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
          this.getIndexes(connectionId, tableSchema, tableName),
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
        this.getIndexes(connectionId, schema, table),
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
  private async getIndexes(
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

