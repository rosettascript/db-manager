import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { SchemasService } from '../schemas/schemas.service';
import {
  ChartOptions,
  ChartDataResponse,
  ChartDataPoint,
  AggregationFunction,
  TimeGrouping,
} from './interfaces/chart.interface';
import { ChartOptionsDto } from './dto/chart-options.dto';

@Injectable()
export class ChartsService {
  private readonly logger = new Logger(ChartsService.name);

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly schemasService: SchemasService,
  ) {
    this.logger.log('ChartsService initialized');
  }

  /**
   * Get chart data for a table
   */
  async getTableChartData(
    connectionId: string,
    schema: string,
    table: string,
    options: ChartOptionsDto,
  ): Promise<ChartDataResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    // Sanitize identifiers
    schema = this.sanitizeIdentifier(schema);
    table = this.sanitizeIdentifier(table);

    try {
      // Get table details to validate columns
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Validate columns exist
      const allColumns = tableDetails.columns.map((col) => col.name);
      if (!allColumns.includes(options.xAxisColumn)) {
        throw new BadRequestException(
          `Column ${options.xAxisColumn} does not exist in table ${schema}.${table}`,
        );
      }

      for (const yCol of options.yAxisColumns) {
        if (!allColumns.includes(yCol)) {
          throw new BadRequestException(
            `Column ${yCol} does not exist in table ${schema}.${table}`,
          );
        }
      }

      // Build and execute aggregation query
      const { query, params } = this.buildAggregationQuery(
        schema,
        table,
        options,
        allColumns,
      );

      this.logger.log(`[ChartsService] Aggregation Query: ${query}`);
      this.logger.log(`[ChartsService] Params: ${JSON.stringify(params)}`);

      const result = await pool.query(query, params);

      // Transform results into chart data points
      const data = this.transformToChartData(result.rows, options);

      return {
        success: true,
        chartType: options.chartType,
        data,
        metadata: {
          totalRows: result.rows.length,
          aggregatedRows: result.rows.length,
          xAxisColumn: options.xAxisColumn,
          yAxisColumns: options.yAxisColumns,
          aggregation: options.aggregation,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get chart data from ${schema}.${table}: ${error.message}`,
      );

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to get chart data: ${error.message}`,
      );
    }
  }

  /**
   * Get chart data from query results
   */
  async getQueryChartData(
    connectionId: string,
    queryResults: any[],
    options: ChartOptionsDto,
  ): Promise<ChartDataResponse> {
    if (!queryResults || queryResults.length === 0) {
      return {
        success: true,
        chartType: options.chartType,
        data: [],
        metadata: {
          totalRows: 0,
          aggregatedRows: 0,
        },
      };
    }

    // Get column names from first row
    const availableColumns = Object.keys(queryResults[0]);

    // Validate columns exist in query results
    if (!availableColumns.includes(options.xAxisColumn)) {
      throw new BadRequestException(
        `Column ${options.xAxisColumn} does not exist in query results`,
      );
    }

    for (const yCol of options.yAxisColumns) {
      if (!availableColumns.includes(yCol)) {
        throw new BadRequestException(
          `Column ${yCol} does not exist in query results`,
        );
      }
    }

    // Transform results into chart data points
    // For query results, we'll do simple aggregation in memory
    const data = this.transformQueryResultsToChartData(
      queryResults,
      options,
    );

    return {
      success: true,
      chartType: options.chartType,
      data,
      metadata: {
        totalRows: queryResults.length,
        aggregatedRows: data.length,
        xAxisColumn: options.xAxisColumn,
        yAxisColumns: options.yAxisColumns,
        aggregation: options.aggregation,
      },
    };
  }

  /**
   * Build aggregation query for charts
   */
  private buildAggregationQuery(
    schema: string,
    table: string,
    options: ChartOptionsDto,
    availableColumns: string[],
  ): { query: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;

    // Build SELECT clause
    let selectClause = `"${options.xAxisColumn}"`;

    // Add aggregation for Y-axis columns
    const aggregationFunc = options.aggregation || 'COUNT';
    const yAxisSelects = options.yAxisColumns.map((col) => {
      if (aggregationFunc === 'COUNT') {
        return `COUNT(*) as "${col}_value"`;
      } else {
        return `${aggregationFunc}("${col}") as "${col}_value"`;
      }
    });

    selectClause = `${selectClause}, ${yAxisSelects.join(', ')}`;

    // Build FROM clause
    const fromClause = `"${schema}"."${table}"`;

    // Build WHERE clause from filters
    const whereConditions: string[] = [];
    if (options.filters && options.filters.length > 0) {
      options.filters.forEach((filter) => {
        const condition = this.buildFilterCondition(
          filter,
          paramIndex,
          params,
        );
        if (condition) {
          whereConditions.push(condition.condition);
          paramIndex = condition.nextParamIndex;
        }
      });
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Build GROUP BY clause
    let groupByClause = '';
    if (options.groupBy || options.aggregation) {
      // Group by X-axis column, or by groupBy if specified
      const groupByColumn = options.groupBy || options.xAxisColumn;
      groupByClause = `GROUP BY "${groupByColumn}"`;
    }

    // Build ORDER BY clause (order by X-axis)
    const orderByClause = `ORDER BY "${options.xAxisColumn}" ASC`;

    // Build LIMIT clause
    let limitClause = '';
    if (options.limit) {
      params.push(options.limit);
      limitClause = `LIMIT $${paramIndex}`;
      paramIndex++;
    } else {
      // Default limit for performance
      params.push(1000);
      limitClause = `LIMIT $${paramIndex}`;
      paramIndex++;
    }

    // Combine query parts
    const query = [
      `SELECT ${selectClause}`,
      `FROM ${fromClause}`,
      whereClause,
      groupByClause,
      orderByClause,
      limitClause,
    ]
      .filter((part) => part.length > 0)
      .join(' ');

    return { query, params };
  }

  /**
   * Build filter condition (similar to QueryBuilderService)
   */
  private buildFilterCondition(
    filter: { column: string; operator: string; value: string },
    startParamIndex: number,
    params: any[],
  ): { condition: string; nextParamIndex: number } | null {
    const { column, operator, value } = filter;
    let paramIndex = startParamIndex;

    switch (operator) {
      case 'equals':
        params.push(value);
        return {
          condition: `"${column}" = $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'not_equals':
        params.push(value);
        return {
          condition: `"${column}" != $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'contains':
        params.push(`%${value}%`);
        return {
          condition: `"${column}"::text ILIKE $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'starts_with':
        params.push(`${value}%`);
        return {
          condition: `"${column}"::text ILIKE $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'ends_with':
        params.push(`%${value}`);
        return {
          condition: `"${column}"::text ILIKE $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'gt':
        params.push(value);
        return {
          condition: `"${column}" > $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'lt':
        params.push(value);
        return {
          condition: `"${column}" < $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'gte':
        params.push(value);
        return {
          condition: `"${column}" >= $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      case 'lte':
        params.push(value);
        return {
          condition: `"${column}" <= $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };
      default:
        return null;
    }
  }

  /**
   * Transform query results to chart data points
   */
  private transformToChartData(
    rows: any[],
    options: ChartOptionsDto,
  ): ChartDataPoint[] {
    return rows.map((row) => {
      const xValue = row[options.xAxisColumn];
      const yValues = options.yAxisColumns.map((col) => {
        const valueKey = `${col}_value`;
        return row[valueKey] !== null && row[valueKey] !== undefined
          ? Number(row[valueKey])
          : 0;
      });

      return {
        x: xValue !== null && xValue !== undefined ? String(xValue) : 'NULL',
        y: options.yAxisColumns.length === 1 ? yValues[0] : yValues,
        label: String(xValue),
      };
    });
  }

  /**
   * Transform query results to chart data (in-memory aggregation)
   */
  private transformQueryResultsToChartData(
    rows: any[],
    options: ChartOptionsDto,
  ): ChartDataPoint[] {
    // Simple grouping by X-axis column
    const grouped = new Map<string, any[]>();

    rows.forEach((row) => {
      const xValue = String(row[options.xAxisColumn] ?? 'NULL');
      if (!grouped.has(xValue)) {
        grouped.set(xValue, []);
      }
      grouped.get(xValue)!.push(row);
    });

    // Aggregate each group
    const aggregated: ChartDataPoint[] = [];

    grouped.forEach((groupRows, xValue) => {
      const aggregationFunc = options.aggregation || 'COUNT';

      const yValues = options.yAxisColumns.map((col) => {
        if (aggregationFunc === 'COUNT') {
          return groupRows.length;
        } else if (aggregationFunc === 'SUM') {
          return groupRows.reduce(
            (sum, row) => sum + (Number(row[col]) || 0),
            0,
          );
        } else if (aggregationFunc === 'AVG') {
          const sum = groupRows.reduce(
            (sum, row) => sum + (Number(row[col]) || 0),
            0,
          );
          return groupRows.length > 0 ? sum / groupRows.length : 0;
        } else if (aggregationFunc === 'MIN') {
          return Math.min(
            ...groupRows.map((row) => Number(row[col]) || 0),
          );
        } else if (aggregationFunc === 'MAX') {
          return Math.max(
            ...groupRows.map((row) => Number(row[col]) || 0),
          );
        }
        return 0;
      });

      aggregated.push({
        x: xValue,
        y: options.yAxisColumns.length === 1 ? yValues[0] : yValues,
        label: xValue,
      });
    });

    // Sort by X value
    aggregated.sort((a, b) => {
      const aNum = Number(a.x);
      const bNum = Number(b.x);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return String(a.x).localeCompare(String(b.x));
    });

    // Apply limit
    const limit = options.limit || 1000;
    return aggregated.slice(0, limit);
  }

  /**
   * Sanitize identifier to prevent SQL injection
   */
  private sanitizeIdentifier(identifier: string): string {
    // Remove any characters that aren't alphanumeric, underscore, or dot
    return identifier.replace(/[^a-zA-Z0-9_.]/g, '');
  }
}





