import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Connection, ConnectionStorage } from './interfaces/connection.interface';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@Injectable()
export class ConnectionsRepository {
  private readonly logger = new Logger(ConnectionsRepository.name);
  private readonly storagePath: string;

  constructor(private configService: ConfigService) {
    this.storagePath =
      this.configService.get<string>('CONNECTIONS_FILE_PATH') ||
      './database/connections.json';

    // Ensure directory exists
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.log(`Created directory: ${dir}`);
    }

    // Initialize file if it doesn't exist
    if (!fs.existsSync(this.storagePath)) {
      this.saveStorage({ connections: [] });
      this.logger.log(`Initialized connections storage at: ${this.storagePath}`);
    }
  }

  /**
   * Load connections from storage
   */
  private loadStorage(): ConnectionStorage {
    try {
      const data = fs.readFileSync(this.storagePath, 'utf8');
      const storage: ConnectionStorage = JSON.parse(data);

      // Convert date strings back to Date objects
      storage.connections = storage.connections.map((conn) => ({
        ...conn,
        createdAt: new Date(conn.createdAt),
        updatedAt: new Date(conn.updatedAt),
        lastConnected: conn.lastConnected ? new Date(conn.lastConnected) : undefined,
      }));

      return storage;
    } catch (error) {
      this.logger.error(`Failed to load connections storage: ${error.message}`);
      return { connections: [] };
    }
  }

  /**
   * Save connections to storage
   */
  private saveStorage(storage: ConnectionStorage): void {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(storage, null, 2), 'utf8');
    } catch (error) {
      this.logger.error(`Failed to save connections storage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a unique ID for a connection
   */
  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all connections (without decrypted passwords)
   */
  findAll(): Connection[] {
    const storage = this.loadStorage();
    return storage.connections.map((conn) => ({
      ...conn,
      password: '[ENCRYPTED]', // Don't expose encrypted password
    }));
  }

  /**
   * Get a connection by ID (without decrypted password)
   */
  findOne(id: string): Connection | null {
    const storage = this.loadStorage();
    const connection = storage.connections.find((conn) => conn.id === id);
    if (!connection) {
      return null;
    }
    return {
      ...connection,
      password: '[ENCRYPTED]',
    };
  }

  /**
   * Get connection with decrypted password (for internal use)
   */
  findOneWithPassword(id: string): Connection | null {
    const storage = this.loadStorage();
    const connection = storage.connections.find((conn) => conn.id === id);
    if (!connection) {
      return null;
    }

    try {
      return {
        ...connection,
        password: EncryptionUtil.decrypt(connection.password),
      };
    } catch (error) {
      this.logger.error(`Failed to decrypt password for connection ${id}: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new connection
   */
  create(createDto: CreateConnectionDto): Connection {
    const storage = this.loadStorage();

    // Check if connection name already exists
    const existing = storage.connections.find((conn) => conn.name === createDto.name);
    if (existing) {
      throw new Error(`Connection with name "${createDto.name}" already exists`);
    }

    const now = new Date();
    const connection: Connection = {
      id: this.generateId(),
      name: createDto.name.trim(),
      host: createDto.host.trim(),
      port: createDto.port,
      database: createDto.database.trim(), // Trim database name to remove leading/trailing whitespace
      username: createDto.username.trim(),
      password: EncryptionUtil.encrypt(createDto.password),
      sslMode: createDto.sslMode || 'prefer',
      status: 'disconnected',
      createdAt: now,
      updatedAt: now,
    };

    storage.connections.push(connection);
    this.saveStorage(storage);

    this.logger.log(`Created connection: ${connection.name} (${connection.id})`);

    return {
      ...connection,
      password: '[ENCRYPTED]',
    };
  }

  /**
   * Update a connection
   */
  update(id: string, updateDto: UpdateConnectionDto): Connection | null {
    const storage = this.loadStorage();
    const index = storage.connections.findIndex((conn) => conn.id === id);

    if (index === -1) {
      return null;
    }

    const existing = storage.connections[index];

    // Check if name change conflicts with existing connection
    if (updateDto.name && updateDto.name !== existing.name) {
      const nameExists = storage.connections.some(
        (conn) => conn.name === updateDto.name && conn.id !== id,
      );
      if (nameExists) {
        throw new Error(`Connection with name "${updateDto.name}" already exists`);
      }
    }

    // Encrypt password if it's being updated
    let encryptedPassword = existing.password;
    if (updateDto.password) {
      encryptedPassword = EncryptionUtil.encrypt(updateDto.password);
    }

    // Trim string fields when updating
    const trimmedUpdate: any = {};
    if (updateDto.name !== undefined) trimmedUpdate.name = updateDto.name.trim();
    if (updateDto.host !== undefined) trimmedUpdate.host = updateDto.host.trim();
    if (updateDto.database !== undefined) trimmedUpdate.database = updateDto.database.trim();
    if (updateDto.username !== undefined) trimmedUpdate.username = updateDto.username.trim();

    storage.connections[index] = {
      ...existing,
      ...updateDto,
      ...trimmedUpdate,
      password: encryptedPassword,
      id: existing.id, // Don't allow ID change
      updatedAt: new Date(),
    };

    this.saveStorage(storage);

    this.logger.log(`Updated connection: ${existing.name} (${id})`);

    return {
      ...storage.connections[index],
      password: '[ENCRYPTED]',
    };
  }

  /**
   * Delete a connection
   */
  delete(id: string): boolean {
    const storage = this.loadStorage();
    const index = storage.connections.findIndex((conn) => conn.id === id);

    if (index === -1) {
      return false;
    }

    const connection = storage.connections[index];
    storage.connections.splice(index, 1);
    this.saveStorage(storage);

    this.logger.log(`Deleted connection: ${connection.name} (${id})`);

    return true;
  }

  /**
   * Update connection status
   */
  updateStatus(id: string, status: Connection['status'], lastConnected?: Date): void {
    const storage = this.loadStorage();
    const connection = storage.connections.find((conn) => conn.id === id);

    if (connection) {
      connection.status = status;
      connection.updatedAt = new Date();
      if (lastConnected) {
        connection.lastConnected = lastConnected;
      }
      this.saveStorage(storage);
    }
  }
}

