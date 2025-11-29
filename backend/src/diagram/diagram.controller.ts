import { Controller, Get, Param, Query, ParseArrayPipe, Optional } from '@nestjs/common';
import { DiagramService } from './diagram.service';
import {
  DiagramResponse,
  RelationshipResponse,
} from './interfaces/diagram.interface';

@Controller('connections/:connectionId')
export class DiagramController {
  constructor(private readonly diagramService: DiagramService) {}

  /**
   * Get ER diagram data (nodes + edges)
   * GET /api/connections/:connectionId/db/diagram
   */
  @Get('db/diagram')
  async getDiagram(
    @Param('connectionId') connectionId: string,
    @Query('schemas') schemas?: string,
    @Query('showIsolatedTables') showIsolatedTables?: string,
  ): Promise<DiagramResponse> {
    const schemaArray = schemas ? schemas.split(',') : undefined;
    const showIsolated = showIsolatedTables !== 'false'; // Default to true

    return this.diagramService.getDiagram(connectionId, {
      schemas: schemaArray,
      showIsolatedTables: showIsolated,
    });
  }

  /**
   * Get relationships for a specific table
   * GET /api/connections/:connectionId/db/tables/:schema/:table/relationships
   */
  @Get('db/tables/:schema/:table/relationships')
  async getTableRelationships(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
  ): Promise<RelationshipResponse> {
    return this.diagramService.getTableRelationships(
      connectionId,
      schema,
      table,
    );
  }
}

