import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  RequestTimeoutException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import {
  QueryExecutionResponse,
  ExplainPlanResponse,
} from './interfaces/query.interface';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import { QueryHistoryService } from '../query-history/query-history.service';
import {
  parseSQLParameters,
  buildParameterValues,
  validateParameters,
} from './utils/sql-parameter-parser';

@Injectable()
export class QueriesService {
  private readonly logger = new Logger(QueriesService.name);
  private readonly runningQueries: Map<string, { cancel: () => void; startTime: Date }> =
    new Map();

  // Maximum query length (100KB)
  private readonly MAX_QUERY_LENGTH = 100 * 1024;

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    @Inject(forwardRef(() => QueryHistoryService))
    private readonly queryHistoryService: QueryHistoryService,
  ) {}

  /**
   * Execute a SQL query with timeout and result limiting
   */
  async executeQuery(
    connectionId: string,
    dto: ExecuteQueryDto,
    queryId?: string,
  ): Promise<QueryExecutionResponse> {
    const startTime = Date.now();
    const qId = queryId || `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate query length
    if (dto.query.length > this.MAX_QUERY_LENGTH) {
      throw new BadRequestException(
        `Query too long. Maximum length is ${this.MAX_QUERY_LENGTH} characters`,
      );
    }

    // Basic query validation (prevent dangerous operations in production)
    const dangerousPatterns = [
      /DROP\s+DATABASE/i,
      /DROP\s+SCHEMA/i,
      /TRUNCATE/i,
      /VACUUM/i,
      /REINDEX/i,
    ];

    // For now, allow all queries (can be restricted later with a read-only mode flag)
    // const hasDangerousOperation = dangerousPatterns.some(pattern =>
    //   pattern.test(dto.query)
    // );
    // if (hasDangerousOperation) {
    //   throw new BadRequestException('Dangerous operation detected');
    // }

    // Get connection pool
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    const timeout = (dto.timeout || 30) * 1000; // Convert to milliseconds
    const maxRows = dto.maxRows || 1000;

    // Parse parameters from query
    const parsedQuery = parseSQLParameters(dto.query);
    let finalQuery = dto.query;
    let queryParams: any[] = [];

    // If parameters are found and provided, bind them
    if (parsedQuery.parameters.length > 0) {
      if (dto.parameters) {
        // Validate all parameters are provided
        const validation = validateParameters(parsedQuery.parameters, dto.parameters);
        if (!validation.valid) {
          throw new BadRequestException(
            `Missing required parameters: ${validation.missing.join(', ')}`,
          );
        }

        // Build parameter values array
        queryParams = buildParameterValues(parsedQuery.parameters, dto.parameters);
        finalQuery = parsedQuery.parameterizedQuery;

        this.logger.log(
          `[QueriesService] Executing parameterized query with ${parsedQuery.parameters.length} parameters`,
        );
      } else {
        // Parameters found but not provided - throw error
        const paramNames = parsedQuery.parameters.map(p => p.name).join(', ');
        throw new BadRequestException(
          `Query contains parameters but no values provided. Required parameters: ${paramNames}`,
        );
      }
    }

    // Get a client from the pool
    const client = await pool.connect();
    let queryExecuted = false;

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (!queryExecuted) {
            this.runningQueries.delete(qId);
            reject(new RequestTimeoutException(`Query execution timeout after ${timeout}ms`));
          }
        }, timeout);
      });

      // Create query execution promise with parameter binding
      const queryPromise = client.query(finalQuery, queryParams).then((result) => {
        queryExecuted = true;
        this.runningQueries.delete(qId);
        return result;
      });

      // Track query for cancellation
      // Note: Proper query cancellation requires process ID which is complex
      // For now, we track queries for future implementation
      const cancelFn = () => {
        try {
          this.logger.log(`Query ${qId} cancellation requested`);
          // TODO: Implement proper query cancellation using process ID
          // This requires tracking the PostgreSQL backend PID
        } catch (error) {
          this.logger.error(`Failed to cancel query ${qId}: ${error.message}`);
        }
      };

      this.runningQueries.set(qId, {
        cancel: cancelFn,
        startTime: new Date(),
      });

      // Race between query and timeout
      let result: QueryResult;
      try {
        result = await Promise.race([queryPromise, timeoutPromise]);
      } catch (error: any) {
        queryExecuted = true;
        this.runningQueries.delete(qId);
        throw error;
      }

      const executionTime = Date.now() - startTime;

      // Determine query type (use original query for type detection)
      const queryType = this.getQueryType(dto.query);

      if (queryType === 'SELECT' || queryType === 'WITH') {
        // Handle SELECT queries - return data
        const allRows = result.rows;
        const rows = allRows.slice(0, maxRows);
        const columns = result.fields.map((field) => field.name);

        // Format rows (handle NULL values)
        const data = rows.map((row) => {
          const formattedRow: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            formattedRow[key] = value === null ? null : value;
          }
          return formattedRow;
        });

        const wasTruncated = allRows.length > maxRows;

        const response = {
          success: true,
          data,
          columns,
          rowCount: data.length,
          executionTime,
          query: dto.query,
          message: wasTruncated
            ? `Query returned ${result.rows.length} rows, showing first ${maxRows} rows`
            : undefined,
        };

        // Save to history (async, don't wait)
        this.saveToHistory(connectionId, {
          query: dto.query,
          executionTime,
          rowCount: data.length,
          success: true,
        }).catch((err) => {
          this.logger.warn(`Failed to save query to history: ${err.message}`);
        });

        return response;
      } else {
        // Handle INSERT, UPDATE, DELETE, etc. - return rows affected
        const rowsAffected = result.rowCount || 0;

        const response = {
          success: true,
          rowsAffected,
          executionTime,
          query: dto.query,
          message: `${queryType} completed successfully`,
        };

        // Save to history (async, don't wait)
        this.saveToHistory(connectionId, {
          query: dto.query,
          executionTime,
          rowsAffected,
          success: true,
        }).catch((err) => {
          this.logger.warn(`Failed to save query to history: ${err.message}`);
        });

        return response;
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Clean up tracking on error
      if (!queryExecuted) {
        this.runningQueries.delete(qId);
      }

      if (error instanceof RequestTimeoutException) {
        throw error;
      }

      this.logger.error(`Query execution error: ${error.message}`);
      
      const errorResponse = {
        success: false,
        executionTime,
        query: dto.query,
        error: error.message || 'Query execution failed',
      };

      // Save to history (async, don't wait)
      this.saveToHistory(connectionId, {
        query: dto.query,
        executionTime,
        success: false,
        error: error.message || 'Query execution failed',
      }).catch((err) => {
        this.logger.warn(`Failed to save query to history: ${err.message}`);
      });

      return errorResponse;
    } finally {
      // Always release the client back to the pool
      client.release();
    }
  }

  /**
   * Save query execution to history
   */
  private async saveToHistory(
    connectionId: string,
    data: {
      query: string;
      executionTime: number;
      rowCount?: number;
      rowsAffected?: number;
      success: boolean;
      error?: string;
    },
  ): Promise<void> {
    try {
      await this.queryHistoryService.addToHistory({
        connectionId,
        query: data.query,
        timestamp: new Date(),
        executionTime: data.executionTime,
        rowCount: data.rowCount,
        rowsAffected: data.rowsAffected,
        success: data.success,
        error: data.error,
      });
    } catch (error) {
      // Log but don't throw - history saving shouldn't break query execution
      this.logger.warn(`Failed to save query to history: ${error.message}`);
    }
  }

  /**
   * Get explain plan for a query
   */
  async explainQuery(
    connectionId: string,
    query: string,
    analyze: boolean = false,
    parameters?: Record<string, any>,
  ): Promise<ExplainPlanResponse> {
    // Validate query length
    if (query.length > this.MAX_QUERY_LENGTH) {
      throw new BadRequestException(
        `Query too long. Maximum length is ${this.MAX_QUERY_LENGTH} characters`,
      );
    }

    // Get connection pool
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      // Parse parameters if provided
      let finalQuery = query;
      let queryParams: any[] = [];
      
      if (parameters) {
        const parsedQuery = parseSQLParameters(query);
        
        if (parsedQuery.parameters.length > 0) {
          // Validate parameters
          const validation = validateParameters(parsedQuery.parameters, parameters);
          if (!validation.valid) {
            throw new BadRequestException(
              `Missing required parameters: ${validation.missing.join(', ')}`,
            );
          }
          
          // Build parameter values array
          queryParams = buildParameterValues(parsedQuery.parameters, parameters);
          finalQuery = parsedQuery.parameterizedQuery;
        }
      }
      
      const explainQueryText = analyze
        ? `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT) ${finalQuery}`
        : `EXPLAIN (FORMAT TEXT) ${finalQuery}`;

      const startTime = Date.now();
      const result = queryParams.length > 0
        ? await pool.query(explainQueryText, queryParams)
        : await pool.query(explainQueryText);
      const executionTime = Date.now() - startTime;

      // Parse explain plan
      const planText = result.rows.map((row) => Object.values(row)[0]).join('\n');

      // Extract timing information if ANALYZE was used
      let planningTime: number | undefined;
      let executionTimeFromPlan: number | undefined;

      if (analyze) {
        const planningMatch = planText.match(/Planning Time: ([\d.]+) ms/i);
        const executionMatch = planText.match(/Execution Time: ([\d.]+) ms/i);

        if (planningMatch) {
          planningTime = parseFloat(planningMatch[1]);
        }
        if (executionMatch) {
          executionTimeFromPlan = parseFloat(executionMatch[1]);
        }
      }

      return {
        plan: planText,
        planningTime,
        executionTime: executionTimeFromPlan,
        formattedPlan: planText, // Can be enhanced with formatting later
      };
    } catch (error: any) {
      this.logger.error(`Explain plan error: ${error.message}`);
      throw new BadRequestException(
        `Failed to generate explain plan: ${error.message}`,
      );
    }
  }

  /**
   * Cancel a running query
   */
  async cancelQuery(connectionId: string, queryId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const queryInfo = this.runningQueries.get(queryId);

    if (!queryInfo) {
      return {
        success: false,
        message: `Query ${queryId} not found or already completed`,
      };
    }

    try {
      queryInfo.cancel();
      this.runningQueries.delete(queryId);

      return {
        success: true,
        message: `Query ${queryId} cancelled successfully`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to cancel query ${queryId}: ${error.message}`);
      return {
        success: false,
        message: `Failed to cancel query: ${error.message}`,
      };
    }
  }

  /**
   * Determine query type from SQL string
   */
  private getQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    
    if (trimmed.startsWith('WITH')) {
      return 'WITH';
    }
    if (trimmed.startsWith('SELECT')) {
      return 'SELECT';
    }
    if (trimmed.startsWith('INSERT')) {
      return 'INSERT';
    }
    if (trimmed.startsWith('UPDATE')) {
      return 'UPDATE';
    }
    if (trimmed.startsWith('DELETE')) {
      return 'DELETE';
    }
    if (trimmed.startsWith('CREATE')) {
      return 'CREATE';
    }
    if (trimmed.startsWith('ALTER')) {
      return 'ALTER';
    }
    if (trimmed.startsWith('DROP')) {
      return 'DROP';
    }

    return 'UNKNOWN';
  }

  /**
   * Get all running queries for a connection
   */
  getRunningQueries(connectionId: string): string[] {
    return Array.from(this.runningQueries.keys());
  }
}

