/**
 * Diagram API Service
 * 
 * Handles all ER diagram-related API calls
 */

import apiClient from '../client';
import type {
  DiagramResponse,
  RelationshipResponse,
} from '../types';

export const diagramService = {
  /**
   * Get ER diagram data (nodes + edges)
   * GET /api/connections/:connectionId/db/diagram
   */
  async getDiagram(
    connectionId: string,
    params?: {
      schemas?: string[];
      showIsolatedTables?: boolean;
    },
  ): Promise<DiagramResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.schemas && params.schemas.length > 0) {
      queryParams.append('schemas', params.schemas.join(','));
    }
    if (params?.showIsolatedTables !== undefined) {
      queryParams.append('showIsolatedTables', params.showIsolatedTables.toString());
    }

    const queryString = queryParams.toString();
    const url = `connections/${connectionId}/db/diagram${queryString ? `?${queryString}` : ''}`;

    return apiClient.get<DiagramResponse>(url);
  },

  /**
   * Get relationships for a specific table
   * GET /api/connections/:connectionId/db/tables/:schema/:table/relationships
   */
  async getTableRelationships(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<RelationshipResponse> {
    const url = `connections/${connectionId}/db/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/relationships`;
    
    return apiClient.get<RelationshipResponse>(url);
  },
};

