import { Controller, Get, Post, Param, Query, Body, Res, ParseEnumPipe, DefaultValuePipe, ParseBoolPipe } from '@nestjs/common';
import { Response } from 'express';
import { ExportService } from './export.service';
import { TableExportQueryDto, ExportFormat } from './dto/table-export-query.dto';
import { QueryExportDto } from './dto/query-export.dto';
import { BulkExportDto } from './dto/bulk-export.dto';

@Controller('connections/:connectionId')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  /**
   * Export table data
   * GET /api/connections/:connectionId/db/tables/:schema/:table/export
   */
  @Get('db/tables/:schema/:table/export')
  async exportTableData(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Res() res: Response,
    @Query('format', new ParseEnumPipe(ExportFormat)) format: ExportFormat,
    @Query('includeHeaders', new DefaultValuePipe(true), ParseBoolPipe) includeHeaders?: boolean,
    @Query('filters') filters?: string, // JSON string
    @Query('sort') sort?: string, // JSON string: {"column": "name", "direction": "asc"}
    @Query('search') search?: string,
    @Query('searchColumns') searchColumns?: string, // Comma-separated
    @Query('selectedColumns') selectedColumns?: string, // Comma-separated
    @Query('limit') limit?: number,
  ): Promise<void> {
    // Parse filters if provided
    let parsedFilters;
    if (filters) {
      try {
        parsedFilters = JSON.parse(filters);
      } catch (error) {
        // Ignore parsing errors, use empty array
        parsedFilters = [];
      }
    }

    // Parse sort if provided
    let parsedSort;
    if (sort) {
      try {
        parsedSort = JSON.parse(sort);
      } catch (error) {
        // Ignore parsing errors
      }
    }

    // Parse searchColumns and selectedColumns
    const parsedSearchColumns = searchColumns ? searchColumns.split(',') : undefined;
    const parsedSelectedColumns = selectedColumns ? selectedColumns.split(',') : undefined;

    const options = {
      format,
      includeHeaders,
      filters: parsedFilters,
      sort: parsedSort,
      search,
      searchColumns: parsedSearchColumns,
      selectedColumns: parsedSelectedColumns,
      limit: limit ? parseInt(String(limit)) : undefined,
    };

    await this.exportService.exportTableData(
      connectionId,
      schema,
      table,
      options,
      res,
    );
  }

  /**
   * Export query results
   * POST /api/connections/:connectionId/query/export
   */
  @Post('query/export')
  async exportQueryResults(
    @Param('connectionId') connectionId: string,
    @Body() dto: QueryExportDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.exportService.exportQueryResults(
      connectionId,
      dto.query,
      dto.format,
      dto.includeHeaders !== false,
      res,
    );
  }

  /**
   * Export selected rows by row IDs
   * POST /api/connections/:connectionId/db/tables/:schema/:table/export-selected
   */
  @Post('db/tables/:schema/:table/export-selected')
  async exportSelectedRows(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Body() dto: BulkExportDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.exportService.exportSelectedRows(
      connectionId,
      schema,
      table,
      dto.rowIds,
      dto.format,
      res,
      dto.includeHeaders !== false,
      dto.selectedColumns,
    );
  }

  /**
   * Export full database dump (schema + data)
   * GET /api/connections/:connectionId/export/database-dump
   */
  @Get('export/database-dump')
  async exportFullDatabaseDump(
    @Param('connectionId') connectionId: string,
    @Res() res: Response,
    @Query('schemas') schemas?: string,
    @Query('includeData', new DefaultValuePipe(true), ParseBoolPipe) includeData?: boolean,
  ): Promise<void> {
    const schemaList = schemas ? schemas.split(',').map((s) => s.trim()) : undefined;
    await this.exportService.exportFullDatabaseDump(connectionId, res, {
      schemas: schemaList,
      includeData,
    });
  }

  /**
   * Export schema-only (no data)
   * GET /api/connections/:connectionId/export/schema-only
   */
  @Get('export/schema-only')
  async exportSchemaOnly(
    @Param('connectionId') connectionId: string,
    @Res() res: Response,
    @Query('schemas') schemas?: string,
  ): Promise<void> {
    const schemaList = schemas ? schemas.split(',').map((s) => s.trim()) : undefined;
    await this.exportService.exportSchemaOnly(connectionId, res, {
      schemas: schemaList,
    });
  }
}

