import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { QueryBuilderService, QueryOptions } from '../common/database/query-builder.service';
import { SchemasService } from '../schemas/schemas.service';
import { TableDataResponse, TableCountResponse, DeleteRowResponse, BatchDeleteRequest, BatchUpdateResponse, InsertRowResponse, UpdateRowResponse } from './interfaces/data.interface';
import { FilterRule } from './interfaces/data.interface';

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly queryBuilder: QueryBuilderService,
    private readonly schemasService: SchemasService,
  ) {
    this.logger.log('DataService initialized');
  }

  /**
   * Get paginated table data with filtering, sorting, and search
   */
  async getTableData(
    connectionId: string,
    schema: string,
    table: string,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortColumn?: string;
      sortDirection?: 'asc' | 'desc';
      columns?: string[];
      filters?: FilterRule[];
    },
  ): Promise<TableDataResponse> {
    // Debug: Check available pools
    const activeConnections = this.connectionManager.getActiveConnections();
    this.logger.log(`[DataService] Requested connection ID: ${connectionId}`);
    this.logger.log(`[DataService] Active connections: ${JSON.stringify(activeConnections)}`);
    
    // Get connection pool
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      this.logger.error(`[DataService] Pool not found for connection: ${connectionId}`);
      this.logger.error(`[DataService] Available connections: ${activeConnections.join(', ') || 'NONE'}`);
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected. Available: ${activeConnections.join(', ') || 'none'}`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    // Set defaults
    const page = options.page || 1;
    const pageSize = options.pageSize || 100;
    const offset = (page - 1) * pageSize;

    // Validate and filter requested columns against actual table columns
    let validatedColumns: string[] | undefined;
    if (options.columns && options.columns.length > 0) {
      try {
        const actualColumns = await this.getTableColumns(connectionId, schema, table);
        // Filter to only include columns that actually exist in the table
        validatedColumns = options.columns.filter(col => actualColumns.includes(col));
        
        if (validatedColumns.length === 0) {
          // If no valid columns, use all table columns
          validatedColumns = actualColumns;
        }
        
        if (validatedColumns.length !== options.columns.length) {
          this.logger.warn(
            `[DataService] Filtered out invalid columns. Requested: ${options.columns.join(', ')}, Valid: ${validatedColumns.join(', ')}`,
          );
        }
      } catch (error) {
        // If we can't validate, skip column filtering (will use all columns)
        this.logger.warn(`[DataService] Could not validate columns, using all: ${error}`);
        validatedColumns = undefined;
      }
    }

    // Get all columns for search if search is provided but no columns specified
    let searchColumns = validatedColumns || options.columns;
    if (options.search && !searchColumns) {
      try {
        searchColumns = await this.getTableColumns(connectionId, schema, table);
      } catch (error) {
        // If we can't get columns, skip search
        searchColumns = undefined;
      }
    }

    // Build query options
    const queryOptions: QueryOptions = {
      filters: options.filters?.map((f) => ({
        column: f.column,
        operator: f.operator,
        value: f.value || '',
      })),
      sort: options.sortColumn
        ? {
            column: options.sortColumn,
            direction: options.sortDirection || 'asc',
          }
        : undefined,
      search: options.search,
      searchColumns: searchColumns, // Columns to search in (all columns if search provided)
      limit: pageSize,
      offset: offset,
      selectedColumns: validatedColumns, // Use validated columns
    };

    // Build and execute SELECT query
    const { query: selectQuery, params: selectParams } =
      this.queryBuilder.buildSelectQuery(schema, table, queryOptions);

    // Build and execute COUNT query (for total filtered rows)
    const { query: countQuery, params: countParams } =
      this.queryBuilder.buildCountQuery(schema, table, queryOptions);

    // Debug: Log queries
    this.logger.log(`[DataService] SELECT Query: ${selectQuery}`);
    this.logger.log(`[DataService] SELECT Params: ${JSON.stringify(selectParams)}`);

    try {
      // Execute both queries
      const [dataResult, countResult] = await Promise.all([
        pool.query(selectQuery, selectParams),
        pool.query(countQuery, countParams),
      ]);

      const totalRows = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalRows / pageSize);

      // Format response data
      const formattedData = dataResult.rows.map((row) => {
        const formattedRow: Record<string, any> = {};
        for (const [key, value] of Object.entries(row)) {
          // Handle NULL values
          formattedRow[key] = value === null ? null : value;
        }
        return formattedRow;
      });

      return {
        data: formattedData,
        pagination: {
          page,
          pageSize,
          totalRows,
          totalPages,
        },
      };
    } catch (error: any) {
      this.logger.error(`[DataService] Query execution error: ${error.message}`);
      this.logger.error(`[DataService] Error stack: ${error.stack}`);
      throw new Error(`Failed to fetch table data: ${error.message}`);
    }
  }

  /**
   * Get total row count (with optional filtering)
   */
  async getTableCount(
    connectionId: string,
    schema: string,
    table: string,
    options: {
      search?: string;
      filters?: FilterRule[];
    } = {},
  ): Promise<TableCountResponse> {
    // Get connection pool
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    // Build query options
    const queryOptions: QueryOptions = {
      filters: options.filters?.map((f) => ({
        column: f.column,
        operator: f.operator,
        value: f.value || '',
      })),
      search: options.search,
    };

    // Build and execute COUNT query
    const { query, params } = this.queryBuilder.buildCountQuery(
      schema,
      table,
      queryOptions,
    );

    try {
      const result = await pool.query(query, params);
      const count = parseInt(result.rows[0].count, 10);

      return {
        count,
        filtered: !!(options.search || options.filters?.length),
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch table count: ${error.message}`);
    }
  }

  /**
   * Get all column names for a table (for search across all columns)
   */
  async getTableColumns(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<string[]> {
    // Get connection pool
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    // Query column names from information_schema
    const query = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = $2
      ORDER BY ordinal_position
    `;

    try {
      const result = await pool.query(query, [schema, table]);
      return result.rows.map((row) => row.column_name);
    } catch (error: any) {
      throw new Error(`Failed to fetch table columns: ${error.message}`);
    }
  }

  /**
   * Get distinct values from a column (for autocomplete)
   */
  async getColumnValues(
    connectionId: string,
    schema: string,
    table: string,
    column: string,
    options: { search?: string; limit?: number } = {},
  ): Promise<{ values: string[] }> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize identifiers
    const sanitizedSchema = this.queryBuilder.sanitizeIdentifier(schema);
    const sanitizedTable = this.queryBuilder.sanitizeIdentifier(table);
    const sanitizedColumn = this.queryBuilder.sanitizeIdentifier(column);

    // Build query with optional search filter
    // Use subquery to allow complex ORDER BY with DISTINCT
    let query = `
      SELECT value FROM (
        SELECT DISTINCT "${sanitizedColumn}"::text as value
        FROM "${sanitizedSchema}"."${sanitizedTable}"
        WHERE "${sanitizedColumn}" IS NOT NULL
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (options.search && options.search.length > 0) {
      query += ` AND "${sanitizedColumn}"::text ILIKE $${paramIndex}`;
      params.push(`%${options.search}%`);
      paramIndex++;
    }

    query += `) subquery`;

    if (options.search && options.search.length > 0) {
      // Order by: prefix matches first, then contains matches
      query += ` ORDER BY 
        CASE 
          WHEN value ILIKE $${paramIndex} THEN 1
          ELSE 2
        END,
        value`;
      params.push(`${options.search}%`);
      paramIndex++;
    } else {
      query += ` ORDER BY value`;
    }

    query += ` LIMIT $${paramIndex}`;
    params.push(options.limit || 20);

    try {
      const result = await pool.query(query, params);
      return {
        values: result.rows.map((row) => row.value),
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch column values: ${error.message}`);
    }
  }

  /**
   * Delete a single row by primary key
   */
  async deleteRow(
    connectionId: string,
    schema: string,
    table: string,
    rowId: string,
  ): Promise<DeleteRowResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    try {
      // Get table details to find primary key
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Find primary key columns
      const primaryKeyColumns = tableDetails.columns
        .filter((col) => col.isPrimaryKey)
        .map((col) => col.name);

      if (primaryKeyColumns.length === 0) {
        throw new BadRequestException(
          'Cannot delete row: Table does not have a primary key',
        );
      }

      // Build WHERE clause based on primary key
      let whereConditions: string[];
      let params: any[];

      if (primaryKeyColumns.length === 1) {
        // Single primary key
        whereConditions = [`"${primaryKeyColumns[0]}" = $1`];
        params = [this.parseIdValue(rowId)];
      } else {
        // Composite primary key - expect comma-separated values
        const idValues = String(rowId).split(',');
        if (idValues.length !== primaryKeyColumns.length) {
          throw new BadRequestException(
            `Expected ${primaryKeyColumns.length} values for composite key, got ${idValues.length}`,
          );
        }

        params = idValues.map((val) => this.parseIdValue(val.trim()));
        whereConditions = primaryKeyColumns.map((col, idx) => {
          return `"${col}" = $${idx + 1}`;
        });
      }

      const whereClause = whereConditions.join(' AND ');
      const deleteQuery = `DELETE FROM "${schema}"."${table}" WHERE ${whereClause}`;

      const result = await pool.query(deleteQuery, params);

      if (result.rowCount === 0) {
        return {
          success: false,
          deletedCount: 0,
          message: 'Row not found or already deleted',
        };
      }

      return {
        success: true,
        deletedCount: result.rowCount || 0,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to delete row from ${schema}.${table}: ${error.message}`,
      );
      
      // Handle foreign key constraint violations
      if (error.code === '23503') {
        throw new BadRequestException(
          'Cannot delete row: It is referenced by other rows (foreign key constraint)',
        );
      }

      throw new Error(`Failed to delete row: ${error.message}`);
    }
  }

  /**
   * Delete multiple rows by primary keys (batch delete)
   */
  async deleteRows(
    connectionId: string,
    schema: string,
    table: string,
    request: BatchDeleteRequest,
  ): Promise<DeleteRowResponse> {
    if (!request.rowIds || request.rowIds.length === 0) {
      throw new BadRequestException('No row IDs provided');
    }

    if (request.rowIds.length > 100) {
      throw new BadRequestException(
        'Cannot delete more than 100 rows at once',
      );
    }

    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    try {
      // Get table details to find primary key
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Find primary key columns
      const primaryKeyColumns = tableDetails.columns
        .filter((col) => col.isPrimaryKey)
        .map((col) => col.name);

      if (primaryKeyColumns.length === 0) {
        throw new BadRequestException(
          'Cannot delete rows: Table does not have a primary key',
        );
      }

      // Use a transaction for batch delete
      const client = await pool.connect();
      let totalDeleted = 0;

      try {
        await client.query('BEGIN');

        for (const rowId of request.rowIds) {
          let whereConditions: string[];
          let params: any[];

          if (primaryKeyColumns.length === 1) {
            // Single primary key
            whereConditions = [`"${primaryKeyColumns[0]}" = $1`];
            params = [this.parseIdValue(rowId)];
          } else {
            // Composite primary key
            const idValues = String(rowId).split(',');
            if (idValues.length !== primaryKeyColumns.length) {
              this.logger.warn(
                `Skipping invalid row ID ${rowId}: Expected ${primaryKeyColumns.length} values for composite key`,
              );
              continue;
            }

            params = idValues.map((val) => this.parseIdValue(val.trim()));
            whereConditions = primaryKeyColumns.map((col, idx) => {
              return `"${col}" = $${idx + 1}`;
            });
          }

          const whereClause = whereConditions.join(' AND ');
          const deleteQuery = `DELETE FROM "${schema}"."${table}" WHERE ${whereClause}`;

          const result = await client.query(deleteQuery, params);
          totalDeleted += result.rowCount || 0;
        }

        await client.query('COMMIT');

        return {
          success: true,
          deletedCount: totalDeleted,
          message: `Deleted ${totalDeleted} of ${request.rowIds.length} rows`,
        };
      } catch (error: any) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to delete rows from ${schema}.${table}: ${error.message}`,
      );
      
      // Handle foreign key constraint violations
      if (error.code === '23503') {
        throw new BadRequestException(
          'Cannot delete some rows: They are referenced by other rows (foreign key constraint)',
        );
      }

      throw new Error(`Failed to delete rows: ${error.message}`);
    }
  }

  /**
   * Update multiple rows by primary keys (batch update)
   */
  async updateRows(
    connectionId: string,
    schema: string,
    table: string,
    request: { rowIds: string[]; updates: Array<{ column: string; value: string }> },
  ): Promise<BatchUpdateResponse> {
    if (!request.rowIds || request.rowIds.length === 0) {
      throw new BadRequestException('No row IDs provided');
    }

    if (request.rowIds.length > 100) {
      throw new BadRequestException(
        'Cannot update more than 100 rows at once',
      );
    }

    if (!request.updates || request.updates.length === 0) {
      throw new BadRequestException('No column updates provided');
    }

    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    try {
      // Get table details to find primary key and validate columns
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Find primary key columns
      const primaryKeyColumns = tableDetails.columns
        .filter((col) => col.isPrimaryKey)
        .map((col) => col.name);

      if (primaryKeyColumns.length === 0) {
        throw new BadRequestException(
          'Cannot update rows: Table does not have a primary key',
        );
      }

      // Validate that update columns exist and are not primary keys
      const validColumns = tableDetails.columns.map((col) => col.name);
      const updateColumns = request.updates.map((u) => u.column);
      
      for (const col of updateColumns) {
        if (!validColumns.includes(col)) {
          throw new BadRequestException(`Column "${col}" does not exist in table`);
        }
        if (primaryKeyColumns.includes(col)) {
          throw new BadRequestException(`Cannot update primary key column "${col}"`);
        }
      }

      // Use a transaction for batch update
      const client = await pool.connect();
      let totalUpdated = 0;
      const errors: Array<{ rowId: string; error: string }> = [];

      try {
        await client.query('BEGIN');

        for (const rowId of request.rowIds) {
          try {
            let whereConditions: string[];
            let whereParams: any[];

            if (primaryKeyColumns.length === 1) {
              // Single primary key
              whereConditions = [`"${primaryKeyColumns[0]}" = $1`];
              whereParams = [this.parseIdValue(rowId)];
            } else {
              // Composite primary key
              const idValues = String(rowId).split(',');
              if (idValues.length !== primaryKeyColumns.length) {
                errors.push({
                  rowId,
                  error: `Invalid row ID: Expected ${primaryKeyColumns.length} values for composite key`,
                });
                continue;
              }

              whereParams = idValues.map((val) => this.parseIdValue(val.trim()));
              whereConditions = primaryKeyColumns.map((col, idx) => {
                return `"${col}" = $${idx + 1}`;
              });
            }

            // Build SET clause for updates
            const setClauses: string[] = [];
            const setParams: any[] = [];
            let paramIndex = whereParams.length + 1;

            for (const update of request.updates) {
              const sanitizedColumn = this.queryBuilder.sanitizeIdentifier(update.column);
              setClauses.push(`"${sanitizedColumn}" = $${paramIndex}`);
              
              // Parse value based on column type
              const columnDef = tableDetails.columns.find((c) => c.name === update.column);
              let parsedValue: any = update.value;
              
              if (columnDef) {
                // Try to parse based on type
                if (columnDef.type?.includes('int') || columnDef.type?.includes('numeric')) {
                  const numValue = Number(update.value);
                  if (!isNaN(numValue)) {
                    parsedValue = numValue;
                  }
                } else if (columnDef.type?.includes('bool')) {
                  parsedValue = update.value.toLowerCase() === 'true' || update.value === '1';
                }
              }
              
              setParams.push(parsedValue);
              paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');
            const setClause = setClauses.join(', ');
            const updateQuery = `UPDATE "${schema}"."${table}" SET ${setClause} WHERE ${whereClause}`;
            const allParams = [...whereParams, ...setParams];

            this.logger.log(`[DataService] Batch UPDATE Query: ${updateQuery}, Params: ${JSON.stringify(allParams)}`);

            const result = await client.query(updateQuery, allParams);
            totalUpdated += result.rowCount || 0;
          } catch (rowError: any) {
            this.logger.warn(`Failed to update row ${rowId}: ${rowError.message}`);
            errors.push({
              rowId,
              error: rowError.message || 'Unknown error',
            });
          }
        }

        await client.query('COMMIT');

        return {
          success: errors.length === 0,
          updatedCount: totalUpdated,
          message: `Updated ${totalUpdated} of ${request.rowIds.length} rows`,
          errors: errors.length > 0 ? errors : undefined,
        };
      } catch (error: any) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to update rows in ${schema}.${table}: ${error.message}`,
      );
      
      // Handle constraint violations
      if (error.code === '23503') {
        throw new BadRequestException(
          'Cannot update some rows: Foreign key constraint violation',
        );
      }
      if (error.code === '23505') {
        throw new BadRequestException(
          'Cannot update some rows: Unique constraint violation',
        );
      }
      if (error.code === '23514') {
        throw new BadRequestException(
          'Cannot update some rows: Check constraint violation',
        );
      }

      throw new Error(`Failed to update rows: ${error.message}`);
    }
  }

  /**
   * Insert a new row into a table
   */
  async insertRow(
    connectionId: string,
    schema: string,
    table: string,
    data: Record<string, any>,
  ): Promise<InsertRowResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    try {
      // Get table details to validate columns
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Filter columns to include in INSERT
      // Skip primary keys and auto-increment columns
      // Only include columns that are explicitly provided in data
      const validColumns = tableDetails.columns.filter((col) => {
        // Skip primary key columns (often auto-increment or manually managed)
        if (col.isPrimaryKey) {
          return false;
        }
        // Skip auto-increment columns (detected by default value containing 'nextval')
        if (col.defaultValue && col.defaultValue.includes('nextval')) {
          return false;
        }
        // Skip if column not in data (will use default if available)
        if (!(col.name in data)) {
          return false;
        }
        // Include if column exists and value is provided
        return true;
      });

      // Check if we have any columns to insert
      if (validColumns.length === 0) {
        throw new BadRequestException(
          'No valid columns to insert. Provide at least one non-primary-key column value, or ensure columns have default values.',
        );
      }

      // Build INSERT query
      const columnNames = validColumns.map((col) => `"${col.name}"`);
      const placeholders = validColumns.map((_, idx) => `$${idx + 1}`);
      const values = validColumns.map((col) => {
        const value = data[col.name];
        // Handle null values
        if (value === null || value === undefined || value === '') {
          return null;
        }
        // Convert based on column type hints
        return this.convertValueForColumn(value, col.type);
      });

      const insertQuery = `INSERT INTO "${schema}"."${table}" (${columnNames.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

      const result = await pool.query(insertQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to insert row: No row returned');
      }

      return {
        success: true,
        row: result.rows[0],
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to insert row into ${schema}.${table}: ${error.message}`,
      );
      
      // Handle constraint violations
      if (error.code === '23503') {
        throw new BadRequestException(
          'Foreign key constraint violation: Referenced value does not exist',
        );
      }
      if (error.code === '23505') {
        throw new BadRequestException(
          'Unique constraint violation: Duplicate value in unique column',
        );
      }
      if (error.code === '23502') {
        throw new BadRequestException(
          'NOT NULL constraint violation: Required column is missing a value',
        );
      }

      throw new BadRequestException(`Failed to insert row: ${error.message}`);
    }
  }

  /**
   * Update a single row by primary key
   */
  async updateRow(
    connectionId: string,
    schema: string,
    table: string,
    rowId: string,
    data: Record<string, any>,
  ): Promise<UpdateRowResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize schema and table names
    schema = this.queryBuilder.sanitizeIdentifier(schema);
    table = this.queryBuilder.sanitizeIdentifier(table);

    try {
      // Get table details to find primary key and validate columns
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Find primary key columns
      const primaryKeyColumns = tableDetails.columns
        .filter((col) => col.isPrimaryKey)
        .map((col) => col.name);

      if (primaryKeyColumns.length === 0) {
        throw new BadRequestException(
          'Cannot update row: Table does not have a primary key',
        );
      }

      // Validate that update columns exist and are not primary keys
      const validColumns = tableDetails.columns.map((col) => col.name);
      const updateColumns = Object.keys(data);
      
      for (const col of updateColumns) {
        if (!validColumns.includes(col)) {
          throw new BadRequestException(`Column "${col}" does not exist in table`);
        }
        if (primaryKeyColumns.includes(col)) {
          throw new BadRequestException(`Cannot update primary key column "${col}"`);
        }
      }

      if (updateColumns.length === 0) {
        throw new BadRequestException('No columns to update');
      }

      // Build WHERE clause based on primary key
      let whereConditions: string[];
      let whereParams: any[];

      if (primaryKeyColumns.length === 1) {
        whereConditions = [`"${primaryKeyColumns[0]}" = $1`];
        whereParams = [this.parseIdValue(rowId)];
      } else {
        // Composite primary key
        const idValues = String(rowId).split(',');
        if (idValues.length !== primaryKeyColumns.length) {
          throw new BadRequestException(
            `Expected ${primaryKeyColumns.length} values for composite key, got ${idValues.length}`,
          );
        }

        whereParams = idValues.map((val) => this.parseIdValue(val.trim()));
        whereConditions = primaryKeyColumns.map((col, idx) => {
          return `"${col}" = $${idx + 1}`;
        });
      }

      // Build SET clause
      const setClauses: string[] = [];
      const setParams: any[] = [];
      let paramIndex = whereParams.length + 1;

      for (const [column, value] of Object.entries(data)) {
        const columnInfo = tableDetails.columns.find((col) => col.name === column);
        const convertedValue = columnInfo 
          ? this.convertValueForColumn(value, columnInfo.type)
          : (value === null || value === undefined || value === '' ? null : value);
        
        setClauses.push(`"${column}" = $${paramIndex}`);
        setParams.push(convertedValue);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');
      const updateQuery = `UPDATE "${schema}"."${table}" SET ${setClauses.join(', ')} WHERE ${whereClause} RETURNING *`;

      const allParams = [...whereParams, ...setParams];
      const result = await pool.query(updateQuery, allParams);

      if (result.rowCount === 0) {
        return {
          success: false,
          message: 'Row not found or no changes made',
        };
      }

      return {
        success: true,
        row: result.rows[0],
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to update row in ${schema}.${table}: ${error.message}`,
      );
      
      // Handle constraint violations
      if (error.code === '23503') {
        throw new BadRequestException(
          'Foreign key constraint violation: Referenced value does not exist',
        );
      }
      if (error.code === '23505') {
        throw new BadRequestException(
          'Unique constraint violation: Duplicate value in unique column',
        );
      }
      if (error.code === '23502') {
        throw new BadRequestException(
          'NOT NULL constraint violation: Required column cannot be null',
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to update row: ${error.message}`);
    }
  }

  /**
   * Convert a value to appropriate type for a column
   */
  private convertValueForColumn(value: any, columnType: string): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const typeLower = columnType.toLowerCase();

    // Handle numeric types
    if (typeLower.includes('int') || typeLower.includes('numeric') || typeLower.includes('decimal') || typeLower.includes('real') || typeLower.includes('double') || typeLower.includes('float')) {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }

    // Handle boolean types
    if (typeLower.includes('bool')) {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on';
      }
      return Boolean(value);
    }

    // Handle date/time types
    if (typeLower.includes('date') || typeLower.includes('time')) {
      // Return as string, let PostgreSQL handle conversion
      return String(value);
    }

    // Default: return as string
    return String(value);
  }

  /**
   * Parse ID value - handle UUID, integers, strings
   */
  private parseIdValue(value: string): any {
    // Try to parse as UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      return value;
    }

    // Try to parse as number
    const numValue = Number(value);
    if (!isNaN(numValue) && value.trim() !== '') {
      return numValue;
    }

    // Return as string
    return value.trim();
  }
}

