import { Injectable } from '@nestjs/common';

export interface FilterRule {
  column: string;
  operator: string;
  value: string;
}

export interface SortOption {
  column: string;
  direction: 'asc' | 'desc';
}

export interface QueryOptions {
  filters?: FilterRule[];
  sort?: SortOption;
  search?: string;
  searchColumns?: string[];
  limit?: number;
  offset?: number;
  selectedColumns?: string[];
}

@Injectable()
export class QueryBuilderService {
  /**
   * Build a SELECT query with filters, sorting, pagination, and search
   */
  buildSelectQuery(
    schema: string,
    table: string,
    options: QueryOptions = {},
  ): { query: string; params: any[] } {
    const params: any[] = [];
    let paramIndex = 1;

    // Build column selection
    const columns =
      options.selectedColumns && options.selectedColumns.length > 0
        ? options.selectedColumns.map((col) => `"${col}"`).join(', ')
        : '*';

    // Build FROM clause
    const fromClause = `"${schema}"."${table}"`;

    // Build WHERE conditions
    const whereConditions: string[] = [];

    // Add filters
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

    // Add search
    if (options.search && options.searchColumns && options.searchColumns.length > 0) {
      const searchConditions = options.searchColumns.map((col) => {
        params.push(`%${options.search}%`);
        const condition = `"${col}"::text ILIKE $${paramIndex}`;
        paramIndex++;
        return condition;
      });
      whereConditions.push(`(${searchConditions.join(' OR ')})`);
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (options.sort) {
      orderByClause = `ORDER BY "${options.sort.column}" ${options.sort.direction.toUpperCase()}`;
    }

    // Build LIMIT and OFFSET
    let limitOffsetClause = '';
    if (options.limit !== undefined) {
      params.push(options.limit);
      limitOffsetClause = `LIMIT $${paramIndex}`;
      paramIndex++;
    }
    if (options.offset !== undefined) {
      params.push(options.offset);
      limitOffsetClause += ` OFFSET $${paramIndex}`;
    }

    // Combine WHERE conditions
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Build final query
    const query = [
      `SELECT ${columns}`,
      `FROM ${fromClause}`,
      whereClause,
      orderByClause,
      limitOffsetClause,
    ]
      .filter((clause) => clause.length > 0)
      .join(' ');

    return { query, params };
  }

  /**
   * Build a COUNT query with the same filters
   */
  buildCountQuery(
    schema: string,
    table: string,
    options: QueryOptions = {},
  ): { query: string; params: any[] } {
    // Build count query without LIMIT/OFFSET to avoid param mismatch
    const countOptions = { ...options };
    delete countOptions.limit;
    delete countOptions.offset;
    
    const { query: selectQuery, params } = this.buildSelectQuery(
      schema,
      table,
      countOptions,
    );

    // Replace SELECT ... FROM with SELECT COUNT(*) FROM
    const countQuery = selectQuery.replace(/^SELECT .*? FROM/, 'SELECT COUNT(*) FROM');

    // Remove ORDER BY from count query (LIMIT/OFFSET already removed from options)
    const cleanedQuery = countQuery.replace(/ORDER BY .*?$/i, '').trim();

    return { query: cleanedQuery, params };
  }

  /**
   * Build a filter condition from a FilterRule
   */
  private buildFilterCondition(
    filter: FilterRule,
    startParamIndex: number,
    params: any[],
  ): { condition: string; nextParamIndex: number } | null {
    let paramIndex = startParamIndex;
    const column = `"${filter.column}"`;

    switch (filter.operator) {
      case 'equals':
        params.push(filter.value);
        return {
          condition: `${column} = $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'not_equals':
        params.push(filter.value);
        return {
          condition: `${column} != $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'contains':
        params.push(`%${filter.value}%`);
        return {
          condition: `${column}::text ILIKE $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'starts_with':
        params.push(`${filter.value}%`);
        return {
          condition: `${column}::text ILIKE $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'ends_with':
        params.push(`%${filter.value}`);
        return {
          condition: `${column}::text ILIKE $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'gt':
        params.push(filter.value);
        return {
          condition: `${column} > $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'lt':
        params.push(filter.value);
        return {
          condition: `${column} < $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'gte':
        params.push(filter.value);
        return {
          condition: `${column} >= $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'lte':
        params.push(filter.value);
        return {
          condition: `${column} <= $${paramIndex}`,
          nextParamIndex: paramIndex + 1,
        };

      case 'is_null':
        return {
          condition: `${column} IS NULL`,
          nextParamIndex: paramIndex,
        };

      case 'is_not_null':
        return {
          condition: `${column} IS NOT NULL`,
          nextParamIndex: paramIndex,
        };

      default:
        return null;
    }
  }

  /**
   * Validate and sanitize a SQL identifier (table/column name)
   */
  sanitizeIdentifier(identifier: string): string {
    // Remove any characters that aren't alphanumeric, underscore, or dot
    return identifier.replace(/[^a-zA-Z0-9_.]/g, '');
  }
}

