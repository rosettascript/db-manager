import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { SchemasService } from '../schemas/schemas.service';
import {
  GlobalSearchResult,
  GlobalSearchResponse,
  ColumnSearchResult,
  ColumnSearchResponse,
  ColumnAutocompleteResult,
} from './interfaces/search.interface';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly MAX_SEARCH_RESULTS = 1000;
  private readonly MAX_DATA_SEARCH_ROWS = 100; // Limit data value searches

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly schemasService: SchemasService,
  ) {}

  /**
   * Global search across all tables, column names, and data values
   */
  async globalSearch(
    connectionId: string,
    query: string,
    options: {
      searchTables?: boolean;
      searchColumnNames?: boolean;
      searchDataValues?: boolean;
      schemas?: string[];
      limit?: number;
    } = {},
  ): Promise<GlobalSearchResponse> {
    const startTime = Date.now();
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Search query cannot be empty');
    }

    const searchTerm = query.trim().toLowerCase();
    const results: GlobalSearchResult[] = [];
    const limit = Math.min(options.limit || this.MAX_SEARCH_RESULTS, this.MAX_SEARCH_RESULTS);

    try {
      // Get schemas to search
      let schemas: string[] = options.schemas || [];
      if (schemas.length === 0) {
        const schemaList = await this.schemasService.getSchemas(connectionId);
        schemas = schemaList.map((s) => s.name);
      }

      // Search tables
      if (options.searchTables !== false) {
        const tableResults = await this.searchTables(
          pool,
          searchTerm,
          schemas,
        );
        results.push(...tableResults);
      }

      // Search column names
      if (options.searchColumnNames !== false) {
        const columnResults = await this.searchColumnNames(
          pool,
          searchTerm,
          schemas,
        );
        results.push(...columnResults);
      }

      // Search data values (more expensive, limit results)
      if (options.searchDataValues !== false && results.length < limit) {
        const dataResults = await this.searchDataValues(
          pool,
          searchTerm,
          schemas,
          limit - results.length,
        );
        results.push(...dataResults);
      }

      // Sort by relevance (tables first, then columns, then data)
      results.sort((a, b) => {
        const typeOrder = { table: 0, column: 1, data: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      const searchTime = Date.now() - startTime;

      return {
        results: results.slice(0, limit),
        total: results.length,
        searchTime,
      };
    } catch (error: any) {
      this.logger.error(`Global search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for tables
   */
  private async searchTables(
    pool: any,
    searchTerm: string,
    schemas: string[],
  ): Promise<GlobalSearchResult[]> {
    const results: GlobalSearchResult[] = [];

    try {
      const query = `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema = ANY($1)
          AND (
            LOWER(table_name) LIKE $2
            OR LOWER(table_schema || '.' || table_name) LIKE $2
          )
        ORDER BY table_schema, table_name
        LIMIT 100;
      `;

      const result = await pool.query(query, [
        schemas,
        `%${searchTerm}%`,
      ]);

      for (const row of result.rows) {
        results.push({
          type: 'table',
          schema: row.table_schema,
          table: row.table_name,
        });
      }
    } catch (error: any) {
      this.logger.warn(`Table search failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Search for column names
   */
  private async searchColumnNames(
    pool: any,
    searchTerm: string,
    schemas: string[],
  ): Promise<GlobalSearchResult[]> {
    const results: GlobalSearchResult[] = [];

    try {
      const query = `
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = ANY($1)
          AND LOWER(column_name) LIKE $2
        ORDER BY table_schema, table_name, column_name
        LIMIT 200;
      `;

      const result = await pool.query(query, [
        schemas,
        `%${searchTerm}%`,
      ]);

      for (const row of result.rows) {
        results.push({
          type: 'column',
          schema: row.table_schema,
          table: row.table_name,
          column: row.column_name,
        });
      }
    } catch (error: any) {
      this.logger.warn(`Column name search failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Search for data values (limited to prevent performance issues)
   */
  private async searchDataValues(
    pool: any,
    searchTerm: string,
    schemas: string[],
    limit: number,
  ): Promise<GlobalSearchResult[]> {
    const results: GlobalSearchResult[] = [];

    try {
      // Get tables to search (limit to first 20 tables for performance)
      const tablesQuery = `
        SELECT DISTINCT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema = ANY($1)
        LIMIT 20;
      `;

      const tablesResult = await pool.query(tablesQuery, [schemas]);

      for (const tableRow of tablesResult.rows) {
        if (results.length >= limit) break;

        const schema = tableRow.table_schema;
        const table = tableRow.table_name;

        try {
          // Get text columns for this table
          const columnsQuery = `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = $1
              AND table_name = $2
              AND data_type IN ('text', 'varchar', 'character varying', 'char', 'character')
            LIMIT 5;
          `;

          const columnsResult = await pool.query(columnsQuery, [schema, table]);

          if (columnsResult.rows.length === 0) continue;

          const columns = columnsResult.rows.map((r) => r.column_name);
          const whereConditions = columns
            .map((col, idx) => `"${col}"::text ILIKE $${idx + 1}`)
            .join(' OR ');

          const searchQuery = `
            SELECT ${columns.map((c) => `"${c}"`).join(', ')}
            FROM "${schema}"."${table}"
            WHERE ${whereConditions}
            LIMIT ${Math.min(10, limit - results.length)};
          `;

          const searchParams = columns.map(() => `%${searchTerm}%`);
          const dataResult = await pool.query(searchQuery, searchParams);

          for (const dataRow of dataResult.rows) {
            for (const col of columns) {
              const value = dataRow[col];
              if (value && String(value).toLowerCase().includes(searchTerm)) {
                results.push({
                  type: 'data',
                  schema,
                  table,
                  column: col,
                  value: String(value).substring(0, 100), // Truncate long values
                });

                if (results.length >= limit) break;
              }
            }
            if (results.length >= limit) break;
          }
        } catch (error: any) {
          // Skip tables that can't be searched (permissions, etc.)
          this.logger.debug(
            `Skipping data search for ${schema}.${table}: ${error.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.warn(`Data value search failed: ${error.message}`);
    }

    return results;
  }

  /**
   * Find tables containing specific columns
   */
  async findTablesWithColumns(
    connectionId: string,
    columnNames: string[],
    options: {
      schemas?: string[];
      matchAll?: boolean; // If true, table must have all columns; if false, any column
    } = {},
  ): Promise<ColumnSearchResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    if (!columnNames || columnNames.length === 0) {
      throw new BadRequestException('Column names cannot be empty');
    }

    try {
      let schemas: string[] = options.schemas || [];
      if (schemas.length === 0) {
        const schemaList = await this.schemasService.getSchemas(connectionId);
        schemas = schemaList.map((s) => s.name);
      }

      const matchAll = options.matchAll || false;

      let query = `
        SELECT DISTINCT
          c.table_schema as schema,
          c.table_name as table,
          c.column_name as column,
          c.data_type,
          c.is_nullable,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT kcu.table_schema, kcu.table_name, kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_schema = pk.table_schema
          AND c.table_name = pk.table_name
          AND c.column_name = pk.column_name
        LEFT JOIN (
          SELECT kcu.table_schema, kcu.table_name, kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.table_schema = fk.table_schema
          AND c.table_name = fk.table_name
          AND c.column_name = fk.column_name
        WHERE c.table_schema = ANY($1)
          AND LOWER(c.column_name) = ANY($2)
      `;

      const params: any[] = [schemas, columnNames.map((c) => c.toLowerCase())];

      if (matchAll) {
        // Group by table and ensure all columns are present
        query = `
          WITH matching_columns AS (
            ${query}
          )
          SELECT *
          FROM matching_columns
          WHERE (schema, table) IN (
            SELECT schema, table
            FROM matching_columns
            GROUP BY schema, table
            HAVING COUNT(DISTINCT column) = $3
          )
          ORDER BY schema, table, column;
        `;
        params.push(columnNames.length);
      } else {
        query += ` ORDER BY schema, table, column;`;
      }

      const result = await pool.query(query, params);

      const searchResults: ColumnSearchResult[] = result.rows.map((row) => ({
        schema: row.schema,
        table: row.table,
        column: row.column,
        dataType: row.data_type,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
      }));

      return {
        results: searchResults,
        total: searchResults.length,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to find tables with columns: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Column name autocomplete
   */
  async columnAutocomplete(
    connectionId: string,
    query: string,
    options: {
      schemas?: string[];
      limit?: number;
    } = {},
  ): Promise<ColumnAutocompleteResult[]> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      let schemas: string[] = options.schemas || [];
      if (schemas.length === 0) {
        const schemaList = await this.schemasService.getSchemas(connectionId);
        schemas = schemaList.map((s) => s.name);
      }

      const searchTerm = query.trim().toLowerCase();
      const limit = options.limit || 50;

      const sqlQuery = `
        SELECT DISTINCT
          table_schema as schema,
          table_name as table,
          column_name as column,
          table_schema || '.' || table_name || '.' || column_name as full_path
        FROM information_schema.columns
        WHERE table_schema = ANY($1)
          AND LOWER(column_name) LIKE $2
        ORDER BY table_schema, table_name, column_name
        LIMIT $3;
      `;

      const result = await pool.query(sqlQuery, [
        schemas,
        `%${searchTerm}%`,
        limit,
      ]);

      return result.rows.map((row) => ({
        schema: row.schema,
        table: row.table,
        column: row.column,
        fullPath: row.full_path,
      }));
    } catch (error: any) {
      this.logger.error(`Column autocomplete failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Filter columns by data type
   */
  async filterColumnsByType(
    connectionId: string,
    dataTypes: string[],
    options: {
      schemas?: string[];
      nullable?: boolean;
      isPrimaryKey?: boolean;
      isForeignKey?: boolean;
    } = {},
  ): Promise<ColumnSearchResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      let schemas: string[] = options.schemas || [];
      if (schemas.length === 0) {
        const schemaList = await this.schemasService.getSchemas(connectionId);
        schemas = schemaList.map((s) => s.name);
      }

      let query = `
        SELECT
          c.table_schema as schema,
          c.table_name as table,
          c.column_name as column,
          c.data_type,
          c.is_nullable,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT kcu.table_schema, kcu.table_name, kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_schema = pk.table_schema
          AND c.table_name = pk.table_name
          AND c.column_name = pk.column_name
        LEFT JOIN (
          SELECT kcu.table_schema, kcu.table_name, kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.table_schema = fk.table_schema
          AND c.table_name = fk.table_name
          AND c.column_name = fk.column_name
        WHERE c.table_schema = ANY($1)
      `;

      const params: any[] = [schemas];

      if (dataTypes && dataTypes.length > 0) {
        query += ` AND LOWER(c.data_type) = ANY($2)`;
        params.push(dataTypes.map((t) => t.toLowerCase()));
      }

      if (options.nullable !== undefined) {
        query += ` AND c.is_nullable = $${params.length + 1}`;
        params.push(options.nullable ? 'YES' : 'NO');
      }

      if (options.isPrimaryKey === true) {
        query += ` AND pk.column_name IS NOT NULL`;
      } else if (options.isPrimaryKey === false) {
        query += ` AND pk.column_name IS NULL`;
      }

      if (options.isForeignKey === true) {
        query += ` AND fk.column_name IS NOT NULL`;
      } else if (options.isForeignKey === false) {
        query += ` AND fk.column_name IS NULL`;
      }

      query += ` ORDER BY schema, table, column;`;

      const result = await pool.query(query, params);

      const searchResults: ColumnSearchResult[] = result.rows.map((row) => ({
        schema: row.schema,
        table: row.table,
        column: row.column,
        dataType: row.data_type,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
      }));

      return {
        results: searchResults,
        total: searchResults.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to filter columns by type: ${error.message}`);
      throw error;
    }
  }
}

