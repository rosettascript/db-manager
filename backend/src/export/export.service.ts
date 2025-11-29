import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { DataService } from '../data/data.service';
import { ExportOptions, ExportFormat } from './interfaces/export.interface';
import { QueriesService } from '../queries/queries.service';
import { SchemasService } from '../schemas/schemas.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private readonly MAX_EXPORT_ROWS = 100000; // Safety limit for exports

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly dataService: DataService,
    private readonly queriesService: QueriesService,
    private readonly schemasService: SchemasService,
  ) {}

  /**
   * Export table data
   */
  async exportTableData(
    connectionId: string,
    schema: string,
    table: string,
    options: ExportOptions,
    res: Response,
  ): Promise<void> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Build query options for data service
    const queryOptions = {
      page: 1,
      pageSize: Math.min(options.limit || this.MAX_EXPORT_ROWS, this.MAX_EXPORT_ROWS),
      filters: options.filters,
      sortColumn: options.sort?.column,
      sortDirection: options.sort?.direction || 'asc',
      search: options.search,
      columns: options.selectedColumns, // Pass array directly
    };

    // Get data using existing data service
    const result = await this.dataService.getTableData(
      connectionId,
      schema,
      table,
      queryOptions,
    );

    // Extract columns from data if not provided
    const columns = options.selectedColumns && options.selectedColumns.length > 0
      ? options.selectedColumns
      : result.data.length > 0
        ? Object.keys(result.data[0])
        : [];

    if (options.format === 'csv') {
      await this.exportAsCSV(
        result.data,
        columns,
        options.includeHeaders !== false,
        res,
        `${schema}_${table}`,
      );
    } else if (options.format === 'json') {
      await this.exportAsJSON(result.data, res, `${schema}_${table}`);
    } else {
      throw new BadRequestException(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Export selected rows by row IDs
   */
  async exportSelectedRows(
    connectionId: string,
    schema: string,
    table: string,
    rowIds: string[],
    format: ExportFormat,
    res: Response,
    includeHeaders: boolean = true,
    selectedColumns?: string[],
  ): Promise<void> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    if (!rowIds || rowIds.length === 0) {
      throw new BadRequestException('No row IDs provided');
    }

    if (rowIds.length > 10000) {
      throw new BadRequestException(
        'Cannot export more than 10,000 rows at once',
      );
    }

    // Sanitize schema and table names
    schema = this.sanitizeIdentifier(schema);
    table = this.sanitizeIdentifier(table);

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
          'Cannot export selected rows: Table does not have a primary key',
        );
      }

      // Build WHERE clause to filter selected rows
      // For each row ID, create a condition matching its primary key values
      const whereConditions: string[] = [];
      let paramIndex = 1;
      const params: any[] = [];

      for (const rowId of rowIds) {
        if (primaryKeyColumns.length === 1) {
          // Single primary key
          const idValue = this.parseIdValue(rowId);
          whereConditions.push(`"${primaryKeyColumns[0]}" = $${paramIndex}`);
          params.push(idValue);
          paramIndex++;
        } else {
          // Composite primary key - row IDs are pipe-separated (e.g., "123|456")
          // Try pipe first, then comma as fallback
          let idValues: string[];
          if (rowId.includes('|')) {
            idValues = rowId.split('|');
          } else if (rowId.includes(',')) {
            idValues = rowId.split(',');
          } else {
            this.logger.warn(
              `Skipping invalid row ID ${rowId}: Expected ${primaryKeyColumns.length} values for composite key`,
            );
            continue;
          }

          if (idValues.length !== primaryKeyColumns.length) {
            this.logger.warn(
              `Skipping invalid row ID ${rowId}: Expected ${primaryKeyColumns.length} values, got ${idValues.length}`,
            );
            continue;
          }

          // Build condition for this composite key
          const keyConditions = primaryKeyColumns.map((col, idx) => {
            const value = this.parseIdValue(idValues[idx].trim());
            params.push(value);
            const currentIndex = paramIndex;
            paramIndex++;
            return `"${col}" = $${currentIndex}`;
          });
          whereConditions.push(`(${keyConditions.join(' AND ')})`);
        }
      }

      if (whereConditions.length === 0) {
        throw new BadRequestException(
          'No valid row IDs provided for export',
        );
      }

      // Build SELECT query
      let columnsClause = '*';
      if (selectedColumns && selectedColumns.length > 0) {
        // Validate columns exist in table
        const validColumns = selectedColumns.filter((col) =>
          tableDetails.columns.some((c) => c.name === col),
        );
        if (validColumns.length > 0) {
          columnsClause = validColumns.map((col) => `"${col}"`).join(', ');
        }
      }

      const whereClause = whereConditions.join(' OR ');
      const query = `SELECT ${columnsClause} FROM "${schema}"."${table}" WHERE ${whereClause}`;

      this.logger.log(
        `[ExportService] Exporting ${rowIds.length} selected rows from ${schema}.${table}`,
      );

      // Execute query
      const result = await pool.query(query, params);
      const rows = result.rows;

      // Determine columns for export
      let exportColumns: string[] = [];
      if (selectedColumns && selectedColumns.length > 0) {
        exportColumns = selectedColumns.filter((col) =>
          tableDetails.columns.some((c) => c.name === col),
        );
      }
      if (exportColumns.length === 0 && rows.length > 0) {
        exportColumns = Object.keys(rows[0]);
      }

      // Export in requested format
      if (format === 'csv') {
        await this.exportAsCSV(
          rows,
          exportColumns,
          includeHeaders,
          res,
          `${schema}_${table}_selected`,
        );
      } else if (format === 'json') {
        await this.exportAsJSON(rows, res, `${schema}_${table}_selected`);
      } else {
        throw new BadRequestException(`Unsupported export format: ${format}`);
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to export selected rows from ${schema}.${table}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Sanitize identifier for SQL
   */
  private sanitizeIdentifier(identifier: string): string {
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
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

  /**
   * Export query results
   */
  async exportQueryResults(
    connectionId: string,
    query: string,
    format: ExportFormat,
    includeHeaders: boolean = true,
    res: Response,
  ): Promise<void> {
    // Execute query using queries service
    const result = await this.queriesService.executeQuery(connectionId, {
      query,
      timeout: 60, // Longer timeout for exports
      maxRows: this.MAX_EXPORT_ROWS,
    });

    if (!result.success) {
      throw new BadRequestException(
        `Query execution failed: ${result.error || 'Unknown error'}`,
      );
    }

    if (format === 'csv') {
      // For CSV, we need columns from the query result
      const columns = (result as any).columns || [];
      const data = (result as any).data || [];
      await this.exportAsCSV(data, columns, includeHeaders, res, 'query_results');
    } else if (format === 'json') {
      const data = (result as any).data || [];
      await this.exportAsJSON(data, res, 'query_results');
    } else {
      throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export data as CSV
   */
  private async exportAsCSV(
    data: any[],
    columns: string[],
    includeHeaders: boolean,
    res: Response,
    filename: string,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}_${Date.now()}.csv"`,
    );
    res.setHeader('Cache-Control', 'no-cache');

    // Write headers if requested
    if (includeHeaders && columns.length > 0) {
      const headerRow = columns
        .map((col) => this.escapeCSVField(col))
        .join(',');
      res.write(headerRow + '\n');
    }

    // Write data rows
    for (const row of data) {
      const csvRow = columns
        .map((col) => {
          const value = row[col];
          if (value === null || value === undefined) {
            return '';
          }
          return this.escapeCSVField(String(value));
        })
        .join(',');
      res.write(csvRow + '\n');
    }

    res.end();
  }

  /**
   * Export data as JSON
   */
  private async exportAsJSON(
    data: any[],
    res: Response,
    filename: string,
  ): Promise<void> {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}_${Date.now()}.json"`,
    );
    res.setHeader('Cache-Control', 'no-cache');

    // Stream JSON array
    res.write('[\n');
    for (let i = 0; i < data.length; i++) {
      const jsonRow = JSON.stringify(data[i]);
      res.write('  ' + jsonRow);
      if (i < data.length - 1) {
        res.write(',\n');
      } else {
        res.write('\n');
      }
    }
    res.write(']\n');
    res.end();
  }

  /**
   * Escape CSV field (handle quotes, commas, newlines)
   */
  private escapeCSVField(field: string): string {
    if (field === null || field === undefined) {
      return '';
    }

    const str = String(field);

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }
}

