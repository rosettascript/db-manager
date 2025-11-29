import { Injectable, Logger } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
}

@Injectable()
export class ConnectionManagerService {
  private readonly logger = new Logger(ConnectionManagerService.name);
  private readonly pools: Map<string, Pool> = new Map();
  private readonly instanceId: string = Math.random().toString(36).substring(7);
  
  constructor() {
    this.logger.log(`ConnectionManagerService instance created: ${this.instanceId}`);
  }

  /**
   * Create a connection pool for a database connection
   */
  async createPool(
    connectionId: string,
    config: DatabaseConnection,
  ): Promise<Pool> {
    // Close existing pool if any
    if (this.pools.has(connectionId)) {
      await this.closePool(connectionId);
    }

    // Log connection details (without password) for debugging
    this.logger.debug(
      `Creating pool for ${connectionId}: host=${config.host}, port=${config.port}, database="${config.database}", user=${config.user}`,
    );

    // Ensure database name is not empty or whitespace
    const databaseName = (config.database || '').trim();
    if (!databaseName) {
      throw new Error('Database name is required and cannot be empty');
    }

    const poolConfig: any = {
      host: config.host,
      port: config.port,
      database: databaseName, // Use trimmed database name
      user: config.user,
      password: config.password,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    // Handle SSL configuration
    if (config.ssl) {
      if (typeof config.ssl === 'boolean' && config.ssl) {
        poolConfig.ssl = { rejectUnauthorized: false };
      } else if (typeof config.ssl === 'object') {
        poolConfig.ssl = config.ssl;
      }
    }

    const pool = new Pool(poolConfig);

    // Test the connection
    try {
      const client = await pool.connect();
      client.release();
      this.logger.log(`Connection pool created for connection: ${connectionId}`);
    } catch (error) {
      this.logger.error(
        `Failed to create connection pool for ${connectionId} (database: "${config.database}"):`,
        error,
      );
      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to connect to database "${config.database}": ${errorMessage}`,
      );
    }

    this.pools.set(connectionId, pool);
    this.logger.log(`Pool stored in instance ${this.instanceId}. Total pools: ${this.pools.size}`);
    return pool;
  }

  /**
   * Get a connection pool by connection ID
   */
  getPool(connectionId: string): Pool | undefined {
    const pool = this.pools.get(connectionId);
    this.logger.debug(`getPool(${connectionId}) called on instance ${this.instanceId}. Pool exists: ${!!pool}, Total pools: ${this.pools.size}`);
    return pool;
  }

  /**
   * Get a client from the pool
   */
  async getClient(connectionId: string): Promise<PoolClient> {
    const pool = this.getPool(connectionId);
    if (!pool) {
      throw new Error(`No connection pool found for: ${connectionId}`);
    }
    return pool.connect();
  }

  /**
   * Test a database connection without creating a pool
   */
  async testConnection(config: DatabaseConnection): Promise<boolean> {
    const testPool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: 1,
      connectionTimeoutMillis: 5000,
      ssl: config.ssl
        ? typeof config.ssl === 'boolean'
          ? { rejectUnauthorized: false }
          : config.ssl
        : false,
    });

    try {
      const client = await testPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      await testPool.end();
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      await testPool.end().catch(() => {});
      return false;
    }
  }

  /**
   * Close a specific connection pool
   */
  async closePool(connectionId: string): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (pool) {
      await pool.end();
      this.pools.delete(connectionId);
      this.logger.log(`Connection pool closed for: ${connectionId}`);
    }
  }

  /**
   * Close all connection pools
   */
  async closeAllPools(): Promise<void> {
    const promises = Array.from(this.pools.keys()).map((id) =>
      this.closePool(id),
    );
    await Promise.all(promises);
    this.logger.log('All connection pools closed');
  }

  /**
   * Check if a connection pool exists and is healthy
   */
  async checkHealth(connectionId: string): Promise<boolean> {
    const pool = this.getPool(connectionId);
    if (!pool) {
      return false;
    }

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      this.logger.error(`Health check failed for ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Get all active connection IDs
   */
  getActiveConnections(): string[] {
    return Array.from(this.pools.keys());
  }
}

