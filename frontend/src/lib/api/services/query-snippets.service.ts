/**
 * Query Snippets API Service
 * 
 * Handles all query snippet-related API calls
 */

import apiClient from '../client';
import type {
  QuerySnippet,
  CreateQuerySnippetDto,
  UpdateQuerySnippetDto,
} from '../types';

export const querySnippetsService = {
  /**
   * Get all snippets
   * GET /api/query-snippets
   */
  async getAllSnippets(options: {
    category?: string;
    search?: string;
  } = {}): Promise<QuerySnippet[]> {
    const params = new URLSearchParams();
    if (options.category) {
      params.append('category', options.category);
    }
    if (options.search) {
      params.append('search', options.search);
    }

    const queryString = params.toString();
    return apiClient.get<QuerySnippet[]>(
      `query-snippets${queryString ? `?${queryString}` : ''}`,
    );
  },

  /**
   * Get snippet by ID
   * GET /api/query-snippets/:id
   */
  async getSnippetById(id: string): Promise<QuerySnippet> {
    return apiClient.get<QuerySnippet>(`query-snippets/${id}`);
  },

  /**
   * Get snippets by category
   * GET /api/query-snippets/category/:category
   */
  async getSnippetsByCategory(category: string): Promise<QuerySnippet[]> {
    return apiClient.get<QuerySnippet[]>(`query-snippets/category/${encodeURIComponent(category)}`);
  },

  /**
   * Get all categories
   * GET /api/query-snippets/categories/list
   */
  async getCategories(): Promise<string[]> {
    return apiClient.get<string[]>('query-snippets/categories/list');
  },

  /**
   * Create a new snippet
   * POST /api/query-snippets
   */
  async createSnippet(dto: CreateQuerySnippetDto): Promise<QuerySnippet> {
    return apiClient.post<QuerySnippet>('query-snippets', dto);
  },

  /**
   * Update a snippet
   * PUT /api/query-snippets/:id
   */
  async updateSnippet(
    id: string,
    dto: UpdateQuerySnippetDto,
  ): Promise<QuerySnippet> {
    return apiClient.put<QuerySnippet>(`query-snippets/${id}`, dto);
  },

  /**
   * Delete a snippet
   * DELETE /api/query-snippets/:id
   */
  async deleteSnippet(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`query-snippets/${id}`);
  },
};

