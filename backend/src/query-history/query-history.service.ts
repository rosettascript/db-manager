import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryHistoryRepository } from './repositories/query-history.repository';
import {
  QueryHistoryItem,
  SavedQuery,
} from './interfaces/query-history.interface';
import {
  CreateSavedQueryDto,
  UpdateSavedQueryDto,
} from './dto';

@Injectable()
export class QueryHistoryService {
  private readonly logger = new Logger(QueryHistoryService.name);

  constructor(
    private readonly repository: QueryHistoryRepository,
  ) {}

  /**
   * Add query to history
   */
  async addToHistory(item: Omit<QueryHistoryItem, 'id'>): Promise<QueryHistoryItem> {
    const historyItem: QueryHistoryItem = {
      ...item,
      id: this.generateId(),
      timestamp: new Date(),
    };

    await this.repository.addToHistory(historyItem);
    return historyItem;
  }

  /**
   * Get query history for a connection
   */
  async getHistory(
    connectionId: string,
    limit?: number,
    search?: string,
  ): Promise<QueryHistoryItem[]> {
    let history = await this.repository.getHistory(connectionId, limit);

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      history = history.filter(
        (item) =>
          item.query.toLowerCase().includes(searchLower) ||
          (item.error && item.error.toLowerCase().includes(searchLower)),
      );
    }

    return history;
  }

  /**
   * Clear query history for a connection
   */
  async clearHistory(connectionId: string): Promise<void> {
    await this.repository.clearHistory(connectionId);
  }

  /**
   * Save a query
   */
  async saveQuery(
    connectionId: string,
    dto: CreateSavedQueryDto,
  ): Promise<SavedQuery> {
    const savedQuery: SavedQuery = {
      id: this.generateId(),
      connectionId,
      name: dto.name,
      query: dto.query,
      tags: dto.tags || [],
      description: dto.description,
      createdAt: new Date(),
    };

    return this.repository.saveQuery(savedQuery);
  }

  /**
   * Update a saved query
   */
  async updateSavedQuery(
    connectionId: string,
    queryId: string,
    dto: UpdateSavedQueryDto,
  ): Promise<SavedQuery> {
    const existing = await this.repository.getSavedQuery(connectionId, queryId);
    if (!existing) {
      throw new NotFoundException(`Saved query ${queryId} not found`);
    }

    const updated: SavedQuery = {
      ...existing,
      ...dto,
      updatedAt: new Date(),
    };

    return this.repository.saveQuery(updated);
  }

  /**
   * Get all saved queries for a connection
   */
  async getSavedQueries(
    connectionId: string,
    search?: string,
  ): Promise<SavedQuery[]> {
    let queries = await this.repository.getSavedQueries(connectionId);

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      queries = queries.filter(
        (q) =>
          q.name.toLowerCase().includes(searchLower) ||
          q.query.toLowerCase().includes(searchLower) ||
          q.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          (q.description &&
            q.description.toLowerCase().includes(searchLower)),
      );
    }

    return queries;
  }

  /**
   * Get a single saved query
   */
  async getSavedQuery(
    connectionId: string,
    queryId: string,
  ): Promise<SavedQuery> {
    const query = await this.repository.getSavedQuery(connectionId, queryId);
    if (!query) {
      throw new NotFoundException(`Saved query ${queryId} not found`);
    }
    return query;
  }

  /**
   * Delete a saved query
   */
  async deleteSavedQuery(
    connectionId: string,
    queryId: string,
  ): Promise<void> {
    const deleted = await this.repository.deleteSavedQuery(
      connectionId,
      queryId,
    );
    if (!deleted) {
      throw new NotFoundException(`Saved query ${queryId} not found`);
    }
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

