import { Controller, Get, Post, Delete, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SchemasService } from './schemas.service';
import { Schema, Table, DatabaseStats, DatabaseFunction, DatabaseView, DatabaseIndex, FunctionCategory, FunctionDetails, ViewDetails, IndexDetails } from './interfaces/schema.interface';
import { DeleteTableDto, DeleteSchemaDto } from './dto';

@Controller('connections/:connectionId/db')
export class SchemasController {
  constructor(private readonly schemasService: SchemasService) {}

  /**
   * Get all schemas
   * GET /api/connections/:connectionId/db/schemas
   */
  @Get('schemas')
  async getSchemas(@Param('connectionId') connectionId: string): Promise<Schema[]> {
    return this.schemasService.getSchemas(connectionId);
  }

  /**
   * Get database statistics
   * GET /api/connections/:connectionId/db/stats
   */
  @Get('stats')
  async getStats(
    @Param('connectionId') connectionId: string,
  ): Promise<DatabaseStats> {
    return this.schemasService.getDatabaseStats(connectionId);
  }

  /**
   * Get all tables (optionally filtered by schema)
   * GET /api/connections/:connectionId/db/tables?schema=public
   */
  @Get('tables')
  async getTables(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema?: string,
  ): Promise<Table[]> {
    return this.schemasService.getTables(connectionId, schema);
  }

  /**
   * Get all functions (optionally filtered by schema and category)
   * GET /api/connections/:connectionId/db/functions?schema=public&category=user
   */
  @Get('functions')
  async getFunctions(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema?: string,
    @Query('category') category?: FunctionCategory,
  ): Promise<DatabaseFunction[]> {
    return this.schemasService.getFunctions(connectionId, schema, category);
  }

  /**
   * Get all views (optionally filtered by schema)
   * GET /api/connections/:connectionId/db/views?schema=public
   */
  @Get('views')
  async getViews(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema?: string,
  ): Promise<DatabaseView[]> {
    return this.schemasService.getViews(connectionId, schema);
  }

  /**
   * Get all indexes (optionally filtered by schema)
   * GET /api/connections/:connectionId/db/indexes?schema=public
   */
  @Get('indexes')
  async getIndexes(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema?: string,
  ): Promise<DatabaseIndex[]> {
    return this.schemasService.getIndexes(connectionId, schema);
  }

  /**
   * Get function details
   * GET /api/connections/:connectionId/db/functions/:schema/:functionName
   */
  @Get('functions/:schema/:functionName')
  async getFunctionDetails(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('functionName') functionName: string,
    @Query('parameters') parameters?: string,
  ): Promise<FunctionDetails> {
    return this.schemasService.getFunctionDetails(connectionId, schema, functionName, parameters);
  }

  /**
   * Get view details
   * GET /api/connections/:connectionId/db/views/:schema/:viewName
   */
  @Get('views/:schema/:viewName')
  async getViewDetails(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('viewName') viewName: string,
  ): Promise<ViewDetails> {
    return this.schemasService.getViewDetails(connectionId, schema, viewName);
  }

  /**
   * Get index details
   * GET /api/connections/:connectionId/db/indexes/:schema/:indexName
   */
  @Get('indexes/:schema/:indexName')
  async getIndexDetails(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('indexName') indexName: string,
  ): Promise<IndexDetails> {
    return this.schemasService.getIndexDetails(connectionId, schema, indexName);
  }

  /**
   * Get table details
   * GET /api/connections/:connectionId/db/tables/:schema/:table
   */
  @Get('tables/:schema/:table')
  async getTableDetails(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
  ): Promise<Table> {
    return this.schemasService.getTableDetails(connectionId, schema, table);
  }

  /**
   * Refresh schema cache (placeholder for future implementation)
   * POST /api/connections/:connectionId/db/schemas/refresh
   */
  @Post('schemas/refresh')
  async refreshSchemas(
    @Param('connectionId') connectionId: string,
  ): Promise<{ success: boolean; message: string }> {
    // For now, just return success - caching can be implemented later
    return {
      success: true,
      message: 'Schema cache refresh initiated (no caching implemented yet)',
    };
  }

  /**
   * Check table dependencies
   * GET /api/connections/:connectionId/db/tables/:schema/:table/dependencies
   */
  @Get('tables/:schema/:table/dependencies')
  async checkTableDependencies(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
  ) {
    return this.schemasService.checkTableDependencies(connectionId, schema, table);
  }

  /**
   * Delete a table
   * DELETE /api/connections/:connectionId/db/tables/:schema/:table
   */
  @Delete('tables/:schema/:table')
  @HttpCode(HttpStatus.OK)
  async deleteTable(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Body() dto: DeleteTableDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.schemasService.deleteTable(connectionId, schema, table, {
      cascade: dto.cascade,
      confirmName: dto.confirmName,
    });
  }

  /**
   * Check schema dependencies
   * GET /api/connections/:connectionId/db/schemas/:schema/dependencies
   */
  @Get('schemas/:schema/dependencies')
  async checkSchemaDependencies(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
  ) {
    return this.schemasService.checkSchemaDependencies(connectionId, schema);
  }

  /**
   * Delete a schema
   * DELETE /api/connections/:connectionId/db/schemas/:schema
   */
  @Delete('schemas/:schema')
  @HttpCode(HttpStatus.OK)
  async deleteSchema(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Body() dto: DeleteSchemaDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.schemasService.deleteSchema(connectionId, schema, {
      cascade: dto.cascade,
      confirmName: dto.confirmName,
    });
  }
}

