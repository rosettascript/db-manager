import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionManagerService, DatabaseConnection } from '../common/database/connection-manager.service';
import { Connection } from './interfaces/connection.interface';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(
    private readonly repository: ConnectionsRepository,
    private readonly connectionManager: ConnectionManagerService,
  ) {}

  /**
   * Get all connections
   */
  async findAll(): Promise<Connection[]> {
    return this.repository.findAll();
  }

  /**
   * Get a connection by ID
   */
  async findOne(id: string): Promise<Connection> {
    const connection = this.repository.findOne(id);
    if (!connection) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }
    return connection;
  }

  /**
   * Create a new connection
   */
  async create(createDto: CreateConnectionDto): Promise<Connection> {
    try {
      const connection = this.repository.create(createDto);
      return connection;
    } catch (error) {
      this.logger.error(`Failed to create connection: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Update a connection
   */
  async update(id: string, updateDto: UpdateConnectionDto): Promise<Connection> {
    // Close existing pool if connection exists
    const existing = this.repository.findOneWithPassword(id);
    if (existing) {
      await this.connectionManager.closePool(id).catch(() => {
        // Ignore errors when closing
      });
    }

    try {
      const connection = this.repository.update(id, updateDto);
      if (!connection) {
        throw new NotFoundException(`Connection with ID ${id} not found`);
      }

      // Update status to disconnected if connection was modified
      if (updateDto.password || updateDto.host || updateDto.port || updateDto.database) {
        this.repository.updateStatus(id, 'disconnected');
      }

      return connection;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update connection: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Delete a connection
   */
  async remove(id: string): Promise<void> {
    // Close connection pool if active
    await this.connectionManager.closePool(id).catch(() => {
      // Ignore errors when closing
    });

    const deleted = this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }
  }

  /**
   * Test a connection
   */
  async testConnection(id: string): Promise<{ success: boolean; message?: string; connectionTime?: number }> {
    const connection = this.repository.findOneWithPassword(id);
    if (!connection) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }

    const startTime = Date.now();
    const config: DatabaseConnection = {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl: this.getSslConfig(connection.sslMode),
    };

    try {
      const success = await this.connectionManager.testConnection(config);
      const connectionTime = Date.now() - startTime;

      if (success) {
        this.repository.updateStatus(id, 'disconnected', new Date());
        return {
          success: true,
          message: 'Connection successful',
          connectionTime,
        };
      } else {
        this.repository.updateStatus(id, 'error');
        return {
          success: false,
          message: 'Connection failed',
          connectionTime,
        };
      }
    } catch (error) {
      this.logger.error(`Connection test failed for ${id}: ${error.message}`);
      this.repository.updateStatus(id, 'error');
      return {
        success: false,
        message: error.message || 'Connection test failed',
        connectionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Connect to a database (create pool)
   */
  async connect(id: string): Promise<{ success: boolean; message?: string }> {
    const connection = this.repository.findOneWithPassword(id);
    if (!connection) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }

    try {
      // Log the connection details being used (without password)
      this.logger.debug(
        `Connecting to database: "${connection.database}" for connection ${id}`,
      );

      const config: DatabaseConnection = {
        host: connection.host,
        port: connection.port,
        database: connection.database.trim(), // Ensure no leading/trailing whitespace
        user: connection.username,
        password: connection.password,
        ssl: this.getSslConfig(connection.sslMode),
      };

      await this.connectionManager.createPool(id, config);
      this.repository.updateStatus(id, 'connected', new Date());

      return {
        success: true,
        message: `Connected to ${connection.name}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to connect to ${id} (database: "${connection.database}"): ${errorMessage}`,
      );
      this.repository.updateStatus(id, 'error');
      throw new BadRequestException(`Failed to connect: ${errorMessage}`);
    }
  }

  /**
   * Disconnect from a database (close pool)
   */
  async disconnect(id: string): Promise<{ success: boolean; message?: string }> {
    const connection = this.repository.findOne(id);
    if (!connection) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }

    try {
      await this.connectionManager.closePool(id);
      this.repository.updateStatus(id, 'disconnected');

      return {
        success: true,
        message: `Disconnected from ${connection.name}`,
      };
    } catch (error) {
      this.logger.error(`Failed to disconnect from ${id}: ${error.message}`);
      throw new BadRequestException(`Failed to disconnect: ${error.message}`);
    }
  }

  /**
   * Get connection status
   */
  async getStatus(id: string): Promise<{
    status: Connection['status'];
    lastConnected?: Date;
    error?: string;
    health?: boolean;
  }> {
    const connection = this.repository.findOne(id);
    if (!connection) {
      throw new NotFoundException(`Connection with ID ${id} not found`);
    }

    const result: {
      status: Connection['status'];
      lastConnected?: Date;
      error?: string;
      health?: boolean;
    } = {
      status: connection.status,
      lastConnected: connection.lastConnected,
    };

    // Check health if connected
    if (connection.status === 'connected') {
      try {
        result.health = await this.connectionManager.checkHealth(id);
        if (!result.health) {
          result.status = 'error';
          result.error = 'Connection pool health check failed';
        }
      } catch (error) {
        result.status = 'error';
        result.error = error.message;
        result.health = false;
      }
    }

    return result;
  }

  /**
   * Convert SSL mode to SSL configuration
   */
  private getSslConfig(
    sslMode: Connection['sslMode'],
  ): boolean | object | undefined {
    switch (sslMode) {
      case 'disable':
        return false;
      case 'allow':
      case 'prefer':
        return { rejectUnauthorized: false };
      case 'require':
        return { rejectUnauthorized: false };
      case 'verify-ca':
        return { rejectUnauthorized: true };
      case 'verify-full':
        return { rejectUnauthorized: true };
      default:
        return false;
    }
  }
}

