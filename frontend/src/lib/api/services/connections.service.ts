/**
 * Connections API Service
 * 
 * Handles all connection-related API calls
 */

import apiClient from '../client';
import type {
  Connection,
  CreateConnectionDto,
  UpdateConnectionDto,
  ConnectionStatus,
  ApiResponse,
  ConnectionTestResponse,
} from '../types';

export const connectionsService = {
  /**
   * List all connections
   * GET /api/connections
   */
  async list(): Promise<Connection[]> {
    return apiClient.get<Connection[]>('connections');
  },

  /**
   * Get connection by ID
   * GET /api/connections/:id
   */
  async getById(id: string): Promise<Connection> {
    return apiClient.get<Connection>(`connections/${id}`);
  },

  /**
   * Create a new connection
   * POST /api/connections
   */
  async create(data: CreateConnectionDto): Promise<Connection> {
    return apiClient.post<Connection>('connections', data);
  },

  /**
   * Update connection
   * PUT /api/connections/:id
   */
  async update(id: string, data: UpdateConnectionDto): Promise<Connection> {
    return apiClient.put<Connection>(`connections/${id}`, data);
  },

  /**
   * Delete connection
   * DELETE /api/connections/:id
   */
  async delete(id: string): Promise<ApiResponse> {
    return apiClient.delete<ApiResponse>(`connections/${id}`);
  },

  /**
   * Test connection
   * POST /api/connections/:id/test
   */
  async test(id: string): Promise<ConnectionTestResponse> {
    return apiClient.post<ConnectionTestResponse>(`connections/${id}/test`);
  },

  /**
   * Connect to database
   * POST /api/connections/:id/connect
   */
  async connect(id: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`connections/${id}/connect`);
  },

  /**
   * Disconnect from database
   * POST /api/connections/:id/disconnect
   */
  async disconnect(id: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>(`connections/${id}/disconnect`);
  },

  /**
   * Get connection status
   * GET /api/connections/:id/status
   */
  async getStatus(id: string): Promise<ConnectionStatus> {
    return apiClient.get<ConnectionStatus>(`connections/${id}/status`);
  },
};

