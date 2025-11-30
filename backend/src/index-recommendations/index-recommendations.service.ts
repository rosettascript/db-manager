import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { QueryHistoryService } from '../query-history/query-history.service';
import { ConnectionsService } from '../connections/connections.service';
import {
  IndexRecommendation,
  IndexUsageStat,
  QueryPattern,
  IndexAnalysisResponse,
} from './interfaces/index-recommendations.interface';

@Injectable()
export class IndexRecommendationsService {
  private readonly logger = new Logger(IndexRecommendationsService.name);

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly queryHistoryService: QueryHistoryService,
    private readonly connectionsService: ConnectionsService,
  ) {}

  /**
   * Ensure connection pool exists, auto-reconnect if needed
   */
  private async ensureConnection(connectionId: string): Promise<void> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      // Check if connection exists and is marked as connected
      try {
        const connection = await this.connectionsService.findOne(connectionId);
        if (connection.status === 'connected') {
          this.logger.log(`Auto-reconnecting ${connectionId} (pool missing but status is connected)`);
          await this.connectionsService.connect(connectionId);
        } else {
          throw new NotFoundException(
            `Connection ${connectionId} is not connected. Status: ${connection.status}`,
          );
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        this.logger.error(`Failed to auto-reconnect ${connectionId}: ${error.message}`);
        throw new NotFoundException(
          `Connection ${connectionId} not found or not connected`,
        );
      }
    }
  }

  /**
   * Analyze query patterns from query history
   */
  async analyzeQueryPatterns(
    connectionId: string,
    limit: number = 1000,
  ): Promise<QueryPattern[]> {
    await this.ensureConnection(connectionId);
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      // Get query history
      const history = await this.queryHistoryService.getHistory(connectionId, limit);

      // Group queries by normalized pattern
      const patternMap = new Map<string, QueryPattern>();

      for (const entry of history) {
        if (!entry.success || !entry.query) continue;

        // Normalize query (remove values, keep structure)
        const normalized = this.normalizeQuery(entry.query);

        if (patternMap.has(normalized)) {
          const pattern = patternMap.get(normalized)!;
          pattern.executionCount++;
          pattern.totalExecutionTime += entry.executionTime || 0;
          pattern.avgExecutionTime =
            pattern.totalExecutionTime / pattern.executionCount;

          if (entry.timestamp && (!pattern.lastExecuted || entry.timestamp > pattern.lastExecuted)) {
            pattern.lastExecuted = entry.timestamp;
          }
        } else {
          // Extract tables and columns from query
          const { tables, columns } = this.extractTablesAndColumns(entry.query);

          patternMap.set(normalized, {
            query: normalized,
            executionCount: 1,
            avgExecutionTime: entry.executionTime || 0,
            totalExecutionTime: entry.executionTime || 0,
            tables,
            columns,
            lastExecuted: entry.timestamp || new Date(),
          });
        }
      }

      return Array.from(patternMap.values())
        .sort((a, b) => b.totalExecutionTime - a.totalExecutionTime);
    } catch (error: any) {
      this.logger.error(
        `Failed to analyze query patterns: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(
    connectionId: string,
    schema?: string,
  ): Promise<IndexUsageStat[]> {
    await this.ensureConnection(connectionId);
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      let query = `
        SELECT
          schemaname as schema,
          relname as table,
          indexrelname as index_name,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          pg_relation_size(indexrelid) as index_size_bytes,
          idx_scan as index_scans,
          idx_tup_read as tuples_read,
          idx_tup_fetch as tuples_fetched
        FROM pg_stat_user_indexes
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      `;

      const params: any[] = [];
      if (schema) {
        query += ` AND schemaname = $1`;
        params.push(schema);
      }

      query += ` ORDER BY schemaname, relname, indexrelname;`;

      this.logger.debug(`Executing index usage stats query for ${connectionId}${schema ? ` (schema: ${schema})` : ''}`);
      const result = await pool.query(query, params);
      this.logger.log(`Found ${result.rows.length} indexes in database for ${connectionId}`);

      return result.rows.map((row) => ({
        schema: row.schema,
        table: row.table,
        indexName: row.index_name,
        indexSize: row.index_size || '0 bytes',
        indexSizeBytes: typeof row.index_size_bytes === 'number' 
          ? row.index_size_bytes 
          : parseInt(String(row.index_size_bytes || '0'), 10) || 0,
        indexScans: typeof row.index_scans === 'number' 
          ? row.index_scans 
          : parseInt(String(row.index_scans || '0'), 10) || 0,
        tuplesRead: typeof row.tuples_read === 'number' 
          ? row.tuples_read 
          : parseInt(String(row.tuples_read || '0'), 10) || 0,
        tuplesFetched: typeof row.tuples_fetched === 'number' 
          ? row.tuples_fetched 
          : parseInt(String(row.tuples_fetched || '0'), 10) || 0,
        isUsed: (typeof row.index_scans === 'number' ? row.index_scans : parseInt(String(row.index_scans || '0'), 10) || 0) > 0,
      }));
    } catch (error: any) {
      this.logger.error(
        `Failed to get index usage stats for ${connectionId}: ${error.message}`,
        error.stack,
      );
      // Re-throw NotFoundException to indicate connection issue
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Return empty array for other errors to allow graceful degradation
      return [];
    }
  }

  /**
   * Suggest missing indexes based on query patterns
   */
  async suggestMissingIndexes(
    connectionId: string,
    schema?: string,
  ): Promise<IndexRecommendation[]> {
    await this.ensureConnection(connectionId);
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      // Get query patterns (may return empty array if no history)
      const patterns = await this.analyzeQueryPatterns(connectionId).catch((err) => {
        this.logger.warn(`Failed to analyze query patterns: ${err.message}`);
        return [];
      });

      // Get existing indexes
      const existingIndexes = await this.getExistingIndexes(connectionId, schema).catch((err) => {
        this.logger.warn(`Failed to get existing indexes: ${err.message}`);
        return [];
      });

      // Get index usage stats (method now handles errors internally)
      const usageStats = await this.getIndexUsageStats(connectionId, schema);

      const recommendations: IndexRecommendation[] = [];
      const recommendationMap = new Map<string, IndexRecommendation>();

      // Analyze patterns for missing indexes
      if (patterns.length === 0) {
        return [];
      }

      // Calculate average execution time
      let totalTime = 0;
      for (const pattern of patterns) {
        totalTime += pattern.avgExecutionTime;
      }
      const avgTime = totalTime / patterns.length;

      for (const pattern of patterns) {
        if (pattern.tables.length === 0) continue;

        // Focus on slow queries (above average execution time)
        if (pattern.avgExecutionTime < avgTime * 0.5) continue;

        for (const table of pattern.tables) {
          const [tableSchema, tableName] = table.includes('.')
            ? table.split('.')
            : ['public', table];

          if (schema && tableSchema !== schema) continue;

          // Find columns used in WHERE, JOIN, ORDER BY
          const relevantColumns = pattern.columns.filter((col) => {
            const colName = col.includes('.') ? col.split('.')[1] : col;
            return pattern.query.toLowerCase().includes(`where ${colName.toLowerCase()}`) ||
                   pattern.query.toLowerCase().includes(`join ${colName.toLowerCase()}`) ||
                   pattern.query.toLowerCase().includes(`order by ${colName.toLowerCase()}`);
          });

          if (relevantColumns.length === 0) continue;

          // Check if index already exists
          const existingIndex = existingIndexes.find(
            (idx) =>
              idx.schema === tableSchema &&
              idx.table === tableName &&
              this.columnsMatch(idx.columns, relevantColumns),
          );

          if (existingIndex) continue;

          // Create recommendation key
          const key = `${tableSchema}.${tableName}:${relevantColumns.sort().join(',')}`;

          if (recommendationMap.has(key)) {
            const existing = recommendationMap.get(key)!;
            existing.estimatedBenefit = this.calculateBenefit(
              existing.estimatedBenefit,
              pattern.avgExecutionTime,
              pattern.executionCount,
            );
          } else {
            const recommendation: IndexRecommendation = {
              schema: tableSchema,
              table: tableName,
              columns: relevantColumns,
              indexType: 'btree', // Default, can be enhanced
              estimatedBenefit: this.calculateBenefit(
                'low',
                pattern.avgExecutionTime,
                pattern.executionCount,
              ),
              reason: `Frequently used in queries with avg execution time: ${pattern.avgExecutionTime.toFixed(2)}ms`,
              createStatement: this.generateCreateIndexStatement(
                tableSchema,
                tableName,
                relevantColumns,
              ),
            };

            recommendationMap.set(key, recommendation);
          }
        }
      }

      return Array.from(recommendationMap.values())
        .sort((a, b) => {
          const priority = { high: 3, medium: 2, low: 1 };
          return priority[b.estimatedBenefit] - priority[a.estimatedBenefit];
        });
    } catch (error: any) {
      this.logger.error(
        `Failed to suggest missing indexes: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Generate CREATE INDEX statement
   */
  generateCreateIndexStatement(
    schema: string,
    table: string,
    columns: string[],
    indexName?: string,
    unique: boolean = false,
  ): string {
    const name = indexName || `idx_${table}_${columns.join('_').replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const uniqueClause = unique ? 'UNIQUE ' : '';
    const columnsList = columns.map((col) => `"${col}"`).join(', ');
    return `CREATE ${uniqueClause}INDEX "${name}" ON "${schema}"."${table}" (${columnsList});`;
  }

  /**
   * Get comprehensive index analysis
   */
  async getIndexAnalysis(
    connectionId: string,
    schema?: string,
  ): Promise<IndexAnalysisResponse> {
    try {
      // Get usage stats first - this is critical data
      let usageStats: IndexUsageStat[] = [];
      try {
        usageStats = await this.getIndexUsageStats(connectionId, schema);
        this.logger.log(`Retrieved ${usageStats.length} index usage stats for ${connectionId}`);
      } catch (err: any) {
        this.logger.error(`Failed to get usage stats for ${connectionId}: ${err.message}`, err.stack);
        // Only return empty if it's not a connection error
        if (err instanceof NotFoundException) {
          throw err; // Re-throw connection errors
        }
      }

      const [recommendations, patterns] = await Promise.all([
        this.suggestMissingIndexes(connectionId, schema).catch((err) => {
          this.logger.warn(`Failed to get recommendations: ${err.message}`);
          return [];
        }),
        this.analyzeQueryPatterns(connectionId).catch((err) => {
          this.logger.warn(`Failed to analyze patterns: ${err.message}`);
          return [];
        }),
      ]);

      const unusedIndexes = usageStats.filter((stat) => !stat.isUsed).length;
      const highPriority = recommendations.filter(
        (r) => r.estimatedBenefit === 'high',
      ).length;

      return {
        recommendations,
        usageStats,
        queryPatterns: patterns.slice(0, 50), // Limit to top 50
        summary: {
          totalIndexes: usageStats.length,
          unusedIndexes,
          recommendedIndexes: recommendations.length,
          highPriorityRecommendations: highPriority,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get index analysis: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Normalize query for pattern matching
   */
  private normalizeQuery(query: string): string {
    // Remove comments
    let normalized = query.replace(/--.*$/gm, '');
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');

    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Replace string literals with placeholders
    normalized = normalized.replace(/'[^']*'/g, "'?'");
    normalized = normalized.replace(/"([^"]*)"/g, (match, p1) => {
      // Keep identifiers but normalize
      return `"${p1.toLowerCase()}"`;
    });

    // Replace numeric literals
    normalized = normalized.replace(/\b\d+\.?\d*\b/g, '?');

    // Lowercase SQL keywords for consistency
    normalized = normalized.replace(
      /\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|AND|OR|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/gi,
      (match) => match.toUpperCase(),
    );

    return normalized;
  }

  /**
   * Extract tables and columns from query
   */
  private extractTablesAndColumns(query: string): {
    tables: string[];
    columns: string[];
  } {
    const tables: string[] = [];
    const columns: string[] = [];

    // Extract FROM and JOIN tables
    const fromMatch = query.match(/FROM\s+([^\s(,]+)/i);
    if (fromMatch) {
      tables.push(fromMatch[1].replace(/["`]/g, ''));
    }

    const joinMatches = query.matchAll(/JOIN\s+([^\s(,]+)/gi);
    for (const match of joinMatches) {
      tables.push(match[1].replace(/["`]/g, ''));
    }

    // Extract column names (simplified)
    const columnMatches = query.matchAll(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>!]/gi);
    for (const match of columnMatches) {
      const col = match[1];
      if (!['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER', 'BY'].includes(col.toUpperCase())) {
        columns.push(col);
      }
    }

    return { tables: [...new Set(tables)], columns: [...new Set(columns)] };
  }

  /**
   * Get existing indexes
   */
  private async getExistingIndexes(
    connectionId: string,
    schema?: string,
  ): Promise<Array<{ schema: string; table: string; columns: string[] }>> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) return [];

    try {
      let query = `
        SELECT
          schemaname as schema,
          tablename as table,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      `;

      const params: any[] = [];
      if (schema) {
        query += ` AND schemaname = $1`;
        params.push(schema);
      }

      const result = await pool.query(query, params);

      return result.rows.map((row) => {
        const match = row.indexdef.match(/\(([^)]+)\)/);
        const columns = match
          ? match[1].split(',').map((col) => col.trim().replace(/["`]/g, ''))
          : [];

        return {
          schema: row.schema,
          table: row.table,
          columns,
        };
      });
    } catch (error) {
      this.logger.warn(`Failed to get existing indexes: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if columns match (for index comparison)
   */
  private columnsMatch(cols1: string[], cols2: string[]): boolean {
    if (cols1.length !== cols2.length) return false;
    const sorted1 = [...cols1].sort();
    const sorted2 = [...cols2].sort();
    return sorted1.every((col, i) => col.toLowerCase() === sorted2[i].toLowerCase());
  }

  /**
   * Calculate benefit level
   */
  private calculateBenefit(
    current: 'high' | 'medium' | 'low',
    executionTime: number,
    executionCount: number,
  ): 'high' | 'medium' | 'low' {
    const score = executionTime * executionCount;
    if (score > 10000) return 'high';
    if (score > 1000) return 'medium';
    return 'low';
  }
}

