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
  QueryValidationResult,
  QueryValidationError,
  QueryValidationWarning,
  QueryOptimizationResult,
  OptimizationRecommendation,
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

    // Determine query type first
    const queryType = this.getQueryType(dto.query);
    const ddlTypes = ['CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT'];
    const isDDLQuery = ddlTypes.includes(queryType);

    // Fix common schema dump issues:
    // 1. USER-DEFINED type references
    // 2. INTEGER(32,0) -> INTEGER (PostgreSQL doesn't support precision for INTEGER)
    // 3. DROP INDEX statements for primary key constraints (these are dropped with the table)
    let processedQuery = this.fixUserDefinedTypes(dto.query);
    processedQuery = this.fixIntegerTypes(processedQuery);
    processedQuery = this.fixPrimaryKeyIndexDrops(processedQuery);

    // Parse parameters from query (skip for DDL queries as they typically don't use parameters)
    let parsedQuery = { parameters: [], parameterizedQuery: processedQuery };
    let finalQuery = processedQuery;
    let queryParams: any[] = [];

    if (!isDDLQuery) {
      parsedQuery = parseSQLParameters(processedQuery);
      
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

      this.logger.error(`Query execution error: ${error.message}`, error.stack);
      
      // Extract more detailed error information for syntax errors
      let errorMessage = error.message || 'Query execution failed';
      if (error.position) {
        // PostgreSQL provides position information for syntax errors
        const lines = dto.query.substring(0, error.position).split('\n');
        const lineNumber = lines.length;
        const columnNumber = lines[lines.length - 1].length + 1;
        errorMessage = `${error.message} (at line ${lineNumber}, column ${columnNumber})`;
      } else if (error.message && error.message.includes('syntax error')) {
        // Try to extract line number from error message if available
        const lineMatch = error.message.match(/line (\d+)/i);
        if (lineMatch) {
          errorMessage = error.message;
        }
      }
      
      const errorResponse = {
        success: false,
        executionTime,
        query: dto.query,
        error: errorMessage,
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

    // Check if query is explainable (EXPLAIN only works with DML statements)
    const queryType = this.getQueryType(query);
    const explainableTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'WITH'];
    const ddlTypes = ['CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT'];
    
    if (!explainableTypes.includes(queryType)) {
      if (ddlTypes.includes(queryType)) {
        throw new BadRequestException(
          `Cannot generate explain plan for ${queryType} statements. EXPLAIN only works with SELECT, INSERT, UPDATE, DELETE, and WITH queries. DDL statements (CREATE, DROP, ALTER, etc.) cannot be explained.`,
        );
      }
      if (queryType === 'UNKNOWN') {
        throw new BadRequestException(
          `Cannot generate explain plan for this query. The query may contain DDL statements, transaction blocks, or unsupported statement types. EXPLAIN only works with SELECT, INSERT, UPDATE, DELETE, and WITH queries.`,
        );
      }
      throw new BadRequestException(
        `Cannot generate explain plan for ${queryType} statements. EXPLAIN only works with SELECT, INSERT, UPDATE, DELETE, and WITH queries.`,
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
   * Handles comments, transaction blocks, and multi-statement queries
   */
  private getQueryType(query: string): string {
    // Remove comments to find the first actual SQL statement
    let cleaned = this.removeComments(query);
    
    // Remove transaction control statements (BEGIN, COMMIT, ROLLBACK)
    cleaned = cleaned.replace(/^\s*(BEGIN|COMMIT|ROLLBACK)\s*;?\s*/gi, '');
    
    const trimmed = cleaned.trim().toUpperCase();
    
    // Check for common SQL statement types
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
    if (trimmed.startsWith('TRUNCATE')) {
      return 'TRUNCATE';
    }
    if (trimmed.startsWith('GRANT') || trimmed.startsWith('REVOKE')) {
      return 'GRANT';
    }
    if (trimmed.startsWith('SET')) {
      return 'SET';
    }

    // For multi-statement queries, try to find the first statement
    // Split by semicolon and check each statement
    const statements = cleaned.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) {
      const stmtUpper = stmt.toUpperCase();
      if (stmtUpper.startsWith('WITH') || stmtUpper.startsWith('SELECT') ||
          stmtUpper.startsWith('INSERT') || stmtUpper.startsWith('UPDATE') ||
          stmtUpper.startsWith('DELETE')) {
        return stmtUpper.split(/\s+/)[0];
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Remove SQL comments from query string
   */
  private removeComments(query: string): string {
    let result = '';
    let i = 0;
    const len = query.length;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let inString = false;
    let stringChar = '';

    while (i < len) {
      const char = query[i];
      const nextChar = i + 1 < len ? query[i + 1] : '';

      // Handle string literals
      if (!inSingleLineComment && !inMultiLineComment) {
        if ((char === "'" || char === '"') && (i === 0 || query[i - 1] !== '\\')) {
          if (!inString) {
            inString = true;
            stringChar = char;
            result += char;
            i++;
            continue;
          } else if (char === stringChar) {
            inString = false;
            stringChar = '';
            result += char;
            i++;
            continue;
          }
        }
        if (inString) {
          result += char;
          i++;
          continue;
        }
      }

      // Handle single-line comments (--)
      if (char === '-' && nextChar === '-' && !inMultiLineComment) {
        inSingleLineComment = true;
        i += 2;
        // Skip until end of line
        while (i < len && query[i] !== '\n') {
          i++;
        }
        if (i < len) {
          result += '\n'; // Preserve newline
        }
        inSingleLineComment = false;
        continue;
      }

      // Handle multi-line comments (/* */)
      if (char === '/' && nextChar === '*' && !inSingleLineComment) {
        inMultiLineComment = true;
        i += 2;
        while (i < len) {
          if (query[i] === '*' && i + 1 < len && query[i + 1] === '/') {
            inMultiLineComment = false;
            i += 2;
            break;
          }
          i++;
        }
        continue;
      }

      if (!inSingleLineComment && !inMultiLineComment) {
        result += char;
      }
      i++;
    }

    return result;
  }

  /**
   * Fix USER-DEFINED type references in schema dumps
   * Replaces USER-DEFINED with actual enum type names based on CREATE TYPE statements and DEFAULT clauses
   */
  private fixUserDefinedTypes(query: string): string {
    // Extract all enum type names from CREATE TYPE statements
    // Pattern: CREATE TYPE "public"."BetSide" AS ENUM or CREATE TYPE "BetSide" AS ENUM
    const enumTypeMap = new Map<string, string>();
    const createTypeRegex = /CREATE\s+TYPE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["']?([^"'\s.]+)["']?\.)?["']?([^"'\s.]+)["']?\s+AS\s+ENUM/gi;
    
    let match;
    while ((match = createTypeRegex.exec(query)) !== null) {
      const schema = match[1] || 'public';
      const typeName = match[2];
      // Store both with and without schema prefix
      enumTypeMap.set(typeName.toLowerCase(), `"${typeName}"`);
      enumTypeMap.set(`${schema}.${typeName.toLowerCase()}`, `"${schema}"."${typeName}"`);
    }

    if (enumTypeMap.size === 0) {
      // No enum types found, return query as-is
      return query;
    }

    // Replace USER-DEFINED by looking ahead in the same column definition for DEFAULT clause
    // This handles patterns like:
    // "column" USER-DEFINED NOT NULL DEFAULT 'value'::"EnumType"
    // "column" USER-DEFINED DEFAULT 'value'::"EnumType" NOT NULL
    let fixedQuery = query;
    
    // First pass: Find all USER-DEFINED columns and extract enum types from DEFAULT clauses
    // Process each CREATE TABLE block separately to maintain table context
    // Use "table.column" as key to handle same column names in different tables
    const columnEnumMap = new Map<string, string>(); // Key: "table.column", Value: enum type
    const tableColumnMap = new Map<number, string>(); // Key: position in query, Value: current table name
    
    // Split query into CREATE TABLE blocks and extract table names
    const tableBlocks: Array<{ start: number; end: number; content: string; tableName: string }> = [];
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["']?([^"'\s.]+)["']?\.)?["']?([^"'\s.]+)["']?\s*\(/gis;
    let tableMatch;
    while ((tableMatch = createTableRegex.exec(query)) !== null) {
      const schema = tableMatch[1] || 'public';
      const tableName = tableMatch[2].toLowerCase();
      const fullTableName = schema === 'public' ? tableName : `${schema}.${tableName}`;
      
      // Find the matching closing parenthesis for this CREATE TABLE
      let depth = 1;
      let pos = tableMatch.index + tableMatch[0].length;
      let endPos = pos;
      while (pos < query.length && depth > 0) {
        if (query[pos] === '(') depth++;
        else if (query[pos] === ')') depth--;
        if (depth === 0) {
          endPos = pos + 1;
          break;
        }
        pos++;
      }
      
      // Find the semicolon after the closing paren
      const semicolonPos = query.indexOf(';', endPos);
      const finalEnd = semicolonPos >= 0 ? semicolonPos + 1 : endPos;
      
      tableBlocks.push({
        start: tableMatch.index,
        end: finalEnd,
        content: query.substring(tableMatch.index, finalEnd),
        tableName: fullTableName,
      });
      
      // Map all positions in this table block to the table name
      for (let i = tableMatch.index; i < finalEnd; i++) {
        tableColumnMap.set(i, fullTableName);
      }
    }
    
    // Process each table block to find USER-DEFINED columns with DEFAULT clauses
    for (const block of tableBlocks) {
      // Find all column definitions with USER-DEFINED in this table
      const columnDefRegex = /"([^"]+)"\s+USER-DEFINED[^,)]*?(?:,|\))/gis;
      let colMatch;
      while ((colMatch = columnDefRegex.exec(block.content)) !== null) {
        const columnName = colMatch[1].toLowerCase();
        const columnDefStart = block.start + colMatch.index;
        const remaining = block.content.substring(colMatch.index);
        
        // Find DEFAULT clause with enum cast in this column definition
        // Pattern: DEFAULT 'value'::"EnumType"
        const defaultRegex = /DEFAULT\s+['"](?:[^'"]+)['"]::"([^"]+)"/gi;
        const defaultMatch = defaultRegex.exec(remaining);
        
        if (defaultMatch) {
          const enumType = defaultMatch[1];
          // Store with table context: "table.column" -> enum type
          const key = `${block.tableName}.${columnName}`;
          columnEnumMap.set(key, `"${enumType}"`);
        }
      }
    }
    
    // Second pass: Replace USER-DEFINED with enum types, using table context
    // We need to process within table blocks to know which table we're in
    let resultQuery = '';
    let lastPos = 0;
    
    for (const block of tableBlocks) {
      // Add content before this block
      resultQuery += query.substring(lastPos, block.start);
      
      // Process this table block
      let processedBlock = block.content;
      const columnDefRegex = /"([^"]+)"\s+USER-DEFINED/gi;
      processedBlock = processedBlock.replace(columnDefRegex, (match, columnName) => {
        const columnLower = columnName.toLowerCase();
        const key = `${block.tableName}.${columnLower}`;
        
        // Check if we found an enum type for this table.column from DEFAULT clause
        if (columnEnumMap.has(key)) {
          return `"${columnName}" ${columnEnumMap.get(key)}`;
        }
        
        // Fall through - will be handled in third pass
        return match;
      });
      
      resultQuery += processedBlock;
      lastPos = block.end;
    }
    
    // Add remaining content after last table
    resultQuery += query.substring(lastPos);
    fixedQuery = resultQuery;
    
    // Third pass: Handle remaining USER-DEFINED columns that don't have DEFAULT clauses
    // Process within table blocks to maintain context
    resultQuery = '';
    lastPos = 0;
    
    for (const block of tableBlocks) {
      // Add content before this block
      resultQuery += fixedQuery.substring(lastPos, block.start);
      
      // Process this table block for remaining USER-DEFINED columns
      let processedBlock = fixedQuery.substring(block.start, block.end);
      const userDefinedRegex = /"([^"]+)"\s+USER-DEFINED/gi;
      processedBlock = processedBlock.replace(userDefinedRegex, (match, columnName) => {
        const columnNameLower = columnName.toLowerCase();
        const key = `${block.tableName}.${columnNameLower}`;
        
        // Skip if already mapped in second pass
        if (columnEnumMap.has(key)) {
          return match; // Shouldn't happen, but just in case
        }
        
        // Common patterns based on column names
        if (columnNameLower === 'side' || columnNameLower === 'winning_side') {
          return `"${columnName}" "BetSide"`;
        }
        if (columnNameLower === 'source') {
          return `"${columnName}" "BetSource"`;
        }
        if (columnNameLower.includes('payment_method')) {
          return `"${columnName}" "PaymentMethod"`;
        }
        if (columnNameLower.includes('share_class')) {
          return `"${columnName}" "ShareClass"`;
        }
        if (columnNameLower.includes('expense_type')) {
          return `"${columnName}" "ExpenseType"`;
        }
        if (columnNameLower.includes('media_type')) {
          return `"${columnName}" "MatchMediaType"`;
        }
        if (columnNameLower.includes('transaction_type')) {
          return `"${columnName}" "ShiftTransactionType"`;
        }
        if (columnNameLower.includes('validation_result') || columnNameLower === 'result') {
          return `"${columnName}" "ValidationResult"`;
        }
        if (columnNameLower.includes('verification_status') || columnNameLower.includes('verification_result')) {
          return `"${columnName}" "VerificationResult"`;
        }
        if (columnNameLower === 'type') {
          // Try to infer from context - if DeviceType exists, use it
          if (enumTypeMap.has('devicetype')) {
            return `"${columnName}" "DeviceType"`;
          }
        }
        
        // For status columns, try to infer from table name
        if (columnNameLower.includes('status')) {
          // Try to match table name to status enum
          const tableNameLower = block.tableName.toLowerCase();
          if (tableNameLower.includes('distribution_suggestion')) {
            return `"${columnName}" "DistributionSuggestionStatus"`;
          }
          if (tableNameLower.includes('event')) {
            return `"${columnName}" "EventStatus"`;
          }
          if (tableNameLower.includes('match')) {
            return `"${columnName}" "MatchStatus"`;
          }
          if (tableNameLower.includes('ticket')) {
            return `"${columnName}" "TicketStatus"`;
          }
          if (tableNameLower.includes('shift')) {
            return `"${columnName}" "ShiftStatus"`;
          }
          if (tableNameLower.includes('notification')) {
            return `"${columnName}" "NotificationStatus"`;
          }
          if (tableNameLower.includes('shareholder')) {
            return `"${columnName}" "ShareholderStatus"`;
          }
          if (tableNameLower.includes('share') && !tableNameLower.includes('shareholder')) {
            return `"${columnName}" "ShareStatus"`;
          }
          if (tableNameLower.includes('payout')) {
            return `"${columnName}" "PayoutStatus"`;
          }
          if (tableNameLower.includes('queued') || tableNameLower.includes('sync')) {
            return `"${columnName}" "QueuedJobStatus"`;
          }
          if (tableNameLower.includes('bet')) {
            return `"${columnName}" "BetStatus"`;
          }
          
          // Fallback: use first available status enum
          const statusEnums = ['BetStatus', 'TicketStatus', 'ShiftStatus', 'EventStatus', 
                              'MatchStatus', 'NotificationStatus', 'DistributionStatus',
                              'DistributionSuggestionStatus', 'ShareholderStatus', 'ShareStatus',
                              'OfflineSyncStatus', 'PayoutStatus', 'QueuedJobStatus'];
          for (const statusEnum of statusEnums) {
            if (enumTypeMap.has(statusEnum.toLowerCase())) {
              return `"${columnName}" "${statusEnum}"`;
            }
          }
        }
        
        // If we still can't determine, try to use the first available enum as last resort
        if (enumTypeMap.size > 0) {
          const firstEnum = Array.from(enumTypeMap.values())[0];
          this.logger.warn(`Could not determine enum type for column "${columnName}" in table "${block.tableName}", using ${firstEnum} as fallback`);
          return `"${columnName}" ${firstEnum}`;
        }
        
        // If no enums found at all, leave as USER-DEFINED
        return match;
      });
      
      resultQuery += processedBlock;
      lastPos = block.end;
    }
    
    // Add remaining content after last table
    resultQuery += fixedQuery.substring(lastPos);
    fixedQuery = resultQuery;

    return fixedQuery;
  }

  /**
   * Fix invalid INTEGER type declarations
   * PostgreSQL doesn't support INTEGER(precision, scale) - only NUMERIC does
   * Converts INTEGER(32,0) to INTEGER
   */
  private fixIntegerTypes(query: string): string {
    // Pattern: INTEGER(32,0) or INTEGER(10) -> INTEGER
    // But be careful not to match NUMERIC(10,2) which is valid
    return query.replace(/\bINTEGER\s*\(\s*\d+\s*(?:,\s*\d+)?\s*\)/gi, 'INTEGER');
  }

  /**
   * Fix DROP INDEX statements for primary key constraints
   * PostgreSQL doesn't allow dropping indexes that are used by primary key constraints
   * These indexes are automatically dropped when the table or constraint is dropped
   */
  private fixPrimaryKeyIndexDrops(query: string): string {
    // Extract all table names and their primary key constraint names
    const primaryKeyMap = new Map<string, string>(); // table -> constraint name
    
    // Find all PRIMARY KEY constraints
    // Pattern: PRIMARY KEY ("id") or CONSTRAINT "table_pkey" PRIMARY KEY
    const pkConstraintRegex = /(?:CONSTRAINT\s+["']?([^"'\s]+)["']?\s+)?PRIMARY\s+KEY/gi;
    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["']?([^"'\s.]+)["']?\.)?["']?([^"'\s.]+)["']?/gi;
    
    // First, find all tables and their primary key constraint names
    let tableMatch;
    const tables: Array<{ name: string; start: number; end: number }> = [];
    while ((tableMatch = createTableRegex.exec(query)) !== null) {
      const schema = tableMatch[1] || 'public';
      const tableName = tableMatch[2].toLowerCase();
      const fullTableName = `${schema}.${tableName}`;
      
      // Find the end of this CREATE TABLE statement
      let depth = 0;
      let pos = tableMatch.index + tableMatch[0].length;
      let foundOpen = false;
      while (pos < query.length) {
        if (query[pos] === '(') {
          depth++;
          foundOpen = true;
        } else if (query[pos] === ')') {
          depth--;
          if (foundOpen && depth === 0) {
            // Find semicolon
            const semicolonPos = query.indexOf(';', pos);
            tables.push({
              name: fullTableName,
              start: tableMatch.index,
              end: semicolonPos >= 0 ? semicolonPos + 1 : pos + 1,
            });
            break;
          }
        }
        pos++;
      }
    }
    
    // For each table, find its primary key constraint name
    for (const table of tables) {
      const tableContent = query.substring(table.start, table.end);
      
      // Look for CONSTRAINT "name" PRIMARY KEY
      const constraintMatch = tableContent.match(/CONSTRAINT\s+["']?([^"'\s]+)["']?\s+PRIMARY\s+KEY/i);
      if (constraintMatch) {
        primaryKeyMap.set(table.name.toLowerCase(), constraintMatch[1].toLowerCase());
      } else {
        // If no explicit constraint name, PostgreSQL uses table_pkey
        const tableNameOnly = table.name.split('.').pop()?.toLowerCase() || '';
        primaryKeyMap.set(table.name.toLowerCase(), `${tableNameOnly}_pkey`);
      }
    }
    
    // Remove DROP INDEX and CREATE INDEX statements for primary key constraints
    // Pattern: DROP INDEX IF EXISTS "schema"."index_name";
    // Pattern: CREATE [UNIQUE] INDEX "schema"."index_name" ...
    let fixedQuery = query;
    
    // Helper function to check if an index is a primary key index
    const isPrimaryKeyIndex = (indexName: string): boolean => {
      const indexNameLower = indexName.toLowerCase();
      
      // Check if this index name matches any primary key constraint name
      for (const [tableName, pkName] of primaryKeyMap.entries()) {
        if (indexNameLower === pkName) {
          return true;
        }
      }
      
      // Also check for common primary key index naming patterns
      if (indexNameLower.endsWith('_pkey')) {
        return true;
      }
      
      return false;
    };
    
    // Remove DROP INDEX statements for primary key indexes
    const dropIndexRegex = /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?(?:["']?([^"'\s.]+)["']?\.)?["']?([^"'\s.]+)["']?/gi;
    fixedQuery = fixedQuery.replace(dropIndexRegex, (match, schema, indexName) => {
      if (isPrimaryKeyIndex(indexName)) {
        // This is a primary key index, skip the DROP INDEX statement
        this.logger.log(`Skipping DROP INDEX for primary key constraint: ${indexName}`);
        return ''; // Remove the DROP INDEX statement
      }
      
      // Keep other DROP INDEX statements
      return match;
    });
    
    // Remove CREATE INDEX statements for primary key indexes
    // Pattern: CREATE [UNIQUE] INDEX "index_name" ON "table" ... ;
    // Match the full statement from CREATE to semicolon
    const createIndexFullRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["']?([^"'\s.]+)["']?\.)?["']?([^"'\s.]+)["']?[^;]+;/gi;
    fixedQuery = fixedQuery.replace(createIndexFullRegex, (match, schema, indexName) => {
      if (isPrimaryKeyIndex(indexName)) {
        this.logger.log(`Removing CREATE INDEX statement for primary key constraint: ${indexName}`);
        return ''; // Remove the entire CREATE INDEX statement
      }
      
      // Keep other CREATE INDEX statements
      return match;
    });
    
    // Clean up any double semicolons or empty lines that might result
    fixedQuery = fixedQuery.replace(/;\s*;/g, ';');
    fixedQuery = fixedQuery.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return fixedQuery;
  }

  /**
   * Get all running queries for a connection
   */
  getRunningQueries(connectionId: string): string[] {
    return Array.from(this.runningQueries.keys());
  }

  /**
   * Validate query syntax
   */
  async validateQuery(
    connectionId: string,
    query: string,
  ): Promise<QueryValidationResult> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    const errors: QueryValidationError[] = [];
    const warnings: QueryValidationWarning[] = [];
    const suggestions: string[] = [];

    try {
      // Basic syntax validation using PostgreSQL's parse check
      // We'll use PREPARE to validate without executing
      const validateQuery = `PREPARE validate_stmt AS ${query}`;

      try {
        await pool.query(validateQuery);
        // If successful, deallocate
        try {
          await pool.query('DEALLOCATE validate_stmt');
        } catch (e) {
          // Ignore deallocation errors
        }
      } catch (error: any) {
        // Parse error message to extract line and position
        const errorMatch = error.message.match(/at character (\d+)/i);
        const position = errorMatch ? parseInt(errorMatch[1]) : undefined;

        // Estimate line number (rough approximation)
        const lines = query.substring(0, position || 0).split('\n');
        const line = lines.length;

        errors.push({
          line,
          column: position ? position - query.substring(0, position).lastIndexOf('\n') : undefined,
          message: error.message,
          severity: 'error',
        });
      }

      // Additional validation checks
      this.performAdditionalValidation(query, errors, warnings, suggestions);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions,
      };
    } catch (error: any) {
      this.logger.error(`Query validation error: ${error.message}`);
      errors.push({
        message: `Validation failed: ${error.message}`,
        severity: 'error',
      });

      return {
        isValid: false,
        errors,
        warnings,
        suggestions,
      };
    }
  }

  /**
   * Perform additional validation checks
   */
  private performAdditionalValidation(
    query: string,
    errors: QueryValidationError[],
    warnings: QueryValidationWarning[],
    suggestions: string[],
  ): void {
    const queryUpper = query.toUpperCase().trim();

    // Check for SELECT * without LIMIT
    if (queryUpper.includes('SELECT *') && !queryUpper.includes('LIMIT')) {
      warnings.push({
        message: 'SELECT * without LIMIT may return large result sets',
        suggestion: 'Consider adding a LIMIT clause or selecting specific columns',
      });
    }

    // Check for missing WHERE clause in DELETE/UPDATE
    if (
      (queryUpper.startsWith('DELETE') || queryUpper.startsWith('UPDATE')) &&
      !queryUpper.includes('WHERE')
    ) {
      warnings.push({
        message: 'DELETE/UPDATE without WHERE clause will affect all rows',
        suggestion: 'Add a WHERE clause to limit affected rows',
      });
    }

    // Check for potential SQL injection patterns (basic)
    if (query.includes(';') && query.split(';').length > 2) {
      warnings.push({
        message: 'Multiple statements detected',
        suggestion: 'Execute one statement at a time for security',
      });
    }

    // Check for missing indexes hints
    if (queryUpper.includes('JOIN') && !queryUpper.includes('ON')) {
      errors.push({
        message: 'JOIN clause missing ON condition',
        severity: 'error',
      });
    }

    // Performance suggestions
    if (queryUpper.includes('LIKE') && !queryUpper.includes("LIKE '%")) {
      suggestions.push('Consider using ILIKE for case-insensitive searches');
    }

    if (queryUpper.includes('ORDER BY') && !queryUpper.includes('LIMIT')) {
      suggestions.push('Consider adding LIMIT when using ORDER BY for better performance');
    }
  }

  /**
   * Analyze query and provide optimization recommendations
   */
  async optimizeQuery(
    connectionId: string,
    query: string,
    analyze: boolean = true,
  ): Promise<QueryOptimizationResult> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      // Get explain plan
      const originalPlan = await this.explainQuery(connectionId, query, analyze);

      const recommendations: OptimizationRecommendation[] = [];
      const planText = originalPlan.plan.toLowerCase();

      // Analyze plan for optimization opportunities
      if (planText.includes('seq scan')) {
        recommendations.push({
          type: 'index',
          priority: 'high',
          message: 'Sequential scan detected - consider adding an index',
          suggestion: 'Add indexes on columns used in WHERE, JOIN, or ORDER BY clauses',
          estimatedImpact: 'High - can reduce scan time significantly',
        });
      }

      if (planText.includes('nested loop')) {
        recommendations.push({
          type: 'join',
          priority: 'medium',
          message: 'Nested loop join detected',
          suggestion: 'Consider using hash join or merge join for larger datasets',
          estimatedImpact: 'Medium - can improve join performance',
        });
      }

      if (planText.includes('sort')) {
        recommendations.push({
          type: 'sort',
          priority: 'medium',
          message: 'Sort operation detected',
          suggestion: 'Consider adding an index on ORDER BY columns to avoid sorting',
          estimatedImpact: 'Medium - can eliminate sort step',
        });
      }

      if (planText.includes('filter')) {
        recommendations.push({
          type: 'filter',
          priority: 'low',
          message: 'Filter operation detected',
          suggestion: 'Move filter conditions earlier in the query if possible',
          estimatedImpact: 'Low - may reduce rows processed',
        });
      }

      // Extract performance metrics from plan
      const costMatch = planText.match(/cost=([\d.]+)\.\.([\d.]+)/);
      const executionTime = originalPlan.executionTime;

      // Index usage analysis
      const indexUsage = await this.analyzeIndexUsage(connectionId, query);

      return {
        originalPlan,
        recommendations: [...recommendations, ...indexUsage],
        performanceMetrics: {
          estimatedCost: costMatch ? parseFloat(costMatch[2]) : undefined,
          executionTime,
        },
      };
    } catch (error: any) {
      this.logger.error(`Query optimization error: ${error.message}`);
      throw new BadRequestException(
        `Failed to optimize query: ${error.message}`,
      );
    }
  }

  /**
   * Analyze index usage for a query
   */
  private async analyzeIndexUsage(
    connectionId: string,
    query: string,
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    try {
      // Extract table and column names from query (simplified)
      const tableMatches = query.matchAll(/FROM\s+["']?(\w+)["']?/gi);
      const whereMatches = query.matchAll(/WHERE\s+["']?(\w+)["']?/gi);

      const tables = Array.from(tableMatches).map((m) => m[1]);
      const whereColumns = Array.from(whereMatches).map((m) => m[1]);

      if (whereColumns.length > 0) {
        recommendations.push({
          type: 'index',
          priority: 'high',
          message: `Columns used in WHERE clause: ${whereColumns.join(', ')}`,
          suggestion: `Consider adding indexes on: ${whereColumns.join(', ')}`,
          estimatedImpact: 'High - can significantly improve WHERE clause performance',
        });
      }

      // Check for ORDER BY
      const orderByMatch = query.match(/ORDER\s+BY\s+["']?(\w+)["']?/i);
      if (orderByMatch) {
        recommendations.push({
          type: 'index',
          priority: 'medium',
          message: `Column used in ORDER BY: ${orderByMatch[1]}`,
          suggestion: `Consider adding an index on ${orderByMatch[1]} to avoid sorting`,
          estimatedImpact: 'Medium - can eliminate sort operation',
        });
      }
    } catch (error: any) {
      this.logger.warn(`Index usage analysis failed: ${error.message}`);
    }

    return recommendations;
  }
}

