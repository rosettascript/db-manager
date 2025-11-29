import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  QueryHistoryItem,
  SavedQuery,
} from '../interfaces/query-history.interface';

@Injectable()
export class QueryHistoryRepository {
  private readonly logger = new Logger(QueryHistoryRepository.name);
  private readonly historyDir = path.join(process.cwd(), 'database', 'query-history');
  private readonly savedQueriesDir = path.join(process.cwd(), 'database', 'saved-queries');

  // Maximum history items per connection
  private readonly MAX_HISTORY_ITEMS = 50;

  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.historyDir, { recursive: true });
      await fs.mkdir(this.savedQueriesDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create directories:', error);
    }
  }

  /**
   * Get history file path for a connection
   */
  private getHistoryFilePath(connectionId: string): string {
    return path.join(this.historyDir, `${connectionId}.json`);
  }

  /**
   * Get saved queries file path for a connection
   */
  private getSavedQueriesFilePath(connectionId: string): string {
    return path.join(this.savedQueriesDir, `${connectionId}.json`);
  }

  /**
   * Add query to history
   */
  async addToHistory(item: QueryHistoryItem): Promise<void> {
    try {
      const filePath = this.getHistoryFilePath(item.connectionId);
      let history: QueryHistoryItem[] = [];

      // Read existing history
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        history = JSON.parse(data).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      } catch (error) {
        // File doesn't exist, start with empty array
        history = [];
      }

      // Add new item at the beginning
      history.unshift(item);

      // Limit history size
      if (history.length > this.MAX_HISTORY_ITEMS) {
        history = history.slice(0, this.MAX_HISTORY_ITEMS);
      }

      // Write back to file
      await fs.writeFile(filePath, JSON.stringify(history, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to add query to history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get query history for a connection
   */
  async getHistory(
    connectionId: string,
    limit?: number,
  ): Promise<QueryHistoryItem[]> {
    try {
      const filePath = this.getHistoryFilePath(connectionId);
      const data = await fs.readFile(filePath, 'utf-8');
      let history: QueryHistoryItem[] = JSON.parse(data).map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }));

      if (limit) {
        history = history.slice(0, limit);
      }

      return history;
    } catch (error) {
      // File doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Clear query history for a connection
   */
  async clearHistory(connectionId: string): Promise<void> {
    try {
      const filePath = this.getHistoryFilePath(connectionId);
      await fs.writeFile(filePath, JSON.stringify([], null, 2), 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to clear history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save a query
   */
  async saveQuery(query: SavedQuery): Promise<SavedQuery> {
    try {
      const filePath = this.getSavedQueriesFilePath(query.connectionId);
      let savedQueries: SavedQuery[] = [];

      // Read existing saved queries
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        savedQueries = JSON.parse(data).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        }));
      } catch (error) {
        // File doesn't exist, start with empty array
        savedQueries = [];
      }

      // Check if query with same ID exists (update) or add new
      const existingIndex = savedQueries.findIndex((q) => q.id === query.id);
      if (existingIndex >= 0) {
        // Update existing
        query.updatedAt = new Date();
        savedQueries[existingIndex] = query;
      } else {
        // Add new
        query.createdAt = new Date();
        savedQueries.push(query);
      }

      // Write back to file
      await fs.writeFile(
        filePath,
        JSON.stringify(savedQueries, null, 2),
        'utf-8',
      );

      return query;
    } catch (error) {
      this.logger.error(`Failed to save query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all saved queries for a connection
   */
  async getSavedQueries(connectionId: string): Promise<SavedQuery[]> {
    try {
      const filePath = this.getSavedQueriesFilePath(connectionId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data).map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      }));
    } catch (error) {
      // File doesn't exist, return empty array
      return [];
    }
  }

  /**
   * Get a single saved query
   */
  async getSavedQuery(
    connectionId: string,
    queryId: string,
  ): Promise<SavedQuery | null> {
    const queries = await this.getSavedQueries(connectionId);
    return queries.find((q) => q.id === queryId) || null;
  }

  /**
   * Delete a saved query
   */
  async deleteSavedQuery(connectionId: string, queryId: string): Promise<boolean> {
    try {
      const filePath = this.getSavedQueriesFilePath(connectionId);
      let savedQueries: SavedQuery[] = [];

      // Read existing saved queries
      try {
        const data = await fs.readFile(filePath, 'utf-8');
        savedQueries = JSON.parse(data).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        }));
      } catch (error) {
        return false; // File doesn't exist, nothing to delete
      }

      // Filter out the query
      const filtered = savedQueries.filter((q) => q.id !== queryId);
      
      if (filtered.length === savedQueries.length) {
        return false; // Query not found
      }

      // Write back to file
      await fs.writeFile(
        filePath,
        JSON.stringify(filtered, null, 2),
        'utf-8',
      );

      return true;
    } catch (error) {
      this.logger.error(`Failed to delete saved query: ${error.message}`);
      throw error;
    }
  }
}

