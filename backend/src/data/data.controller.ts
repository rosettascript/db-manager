import {
  Controller,
  Get,
  Delete,
  Post,
  Put,
  Body,
  Query,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  ParseArrayPipe,
  Optional,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DataService } from './data.service';
import { TableDataQueryDto, TableCountQueryDto } from './dto/table-data-query.dto';
import { BatchDeleteDto } from './dto/batch-delete.dto';
import { BatchUpdateDto } from './dto/batch-update.dto';
import { InsertRowDto } from './dto/insert-row.dto';
import { UpdateRowDto } from './dto/update-row.dto';
import { TableDataResponse, TableCountResponse, FilterRule, DeleteRowResponse, BatchUpdateResponse, InsertRowResponse, UpdateRowResponse } from './interfaces/data.interface';

@Controller('connections/:connectionId/db/tables/:schema/:table')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  /**
   * Get table data with pagination, filtering, sorting, and search
   * GET /api/connections/:connectionId/tables/:schema/:table/data
   */
  @Get('data')
  async getTableData(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(100), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('sortColumn') sortColumn?: string,
    @Query('sortDirection') sortDirection?: 'asc' | 'desc',
    @Query('columns') columns?: string,
    @Query('filters') filters?: string, // JSON stringified FilterRule[]
  ): Promise<TableDataResponse> {
    try {
      // Parse columns (comma-separated string to array)
      const columnArray = columns
        ? columns.split(',').map((c) => c.trim()).filter((c) => c.length > 0)
        : undefined;

      // Parse filters (JSON string to array)
      let filterArray: FilterRule[] | undefined;
      if (filters) {
        try {
          filterArray = JSON.parse(filters) as FilterRule[];
          // Validate filters have required fields
          filterArray = filterArray.filter(
            (f) => f.column && f.operator,
          );
        } catch (error) {
          // Invalid JSON, ignore filters
          filterArray = undefined;
        }
      }

      return await this.dataService.getTableData(connectionId, schema, table, {
        page,
        pageSize: Math.min(pageSize, 1000), // Max 1000 rows per page
        search,
        sortColumn,
        sortDirection: sortDirection || 'asc',
        columns: columnArray,
        filters: filterArray,
      });
    } catch (error: any) {
      console.error('[DataController] Error in getTableData:', error);
      throw error;
    }
  }

  /**
   * Get table row count (with optional filtering)
   * GET /api/connections/:connectionId/tables/:schema/:table/count
   */
  @Get('count')
  async getTableCount(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string, // JSON stringified FilterRule[]
  ): Promise<TableCountResponse> {
    // Parse filters (JSON string to array)
    let filterArray: FilterRule[] | undefined;
    if (filters) {
      try {
        filterArray = JSON.parse(filters) as FilterRule[];
        // Validate filters have required fields
        filterArray = filterArray.filter(
          (f) => f.column && f.operator,
        );
      } catch (error) {
        // Invalid JSON, ignore filters
        filterArray = undefined;
      }
    }

    return this.dataService.getTableCount(connectionId, schema, table, {
      search,
      filters: filterArray,
    });
  }

  /**
   * Delete a single row by primary key
   * DELETE /api/connections/:connectionId/db/tables/:schema/:table/row/:rowId
   */
  @Delete('row/:rowId')
  @HttpCode(HttpStatus.OK)
  async deleteRow(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Param('rowId') rowId: string,
  ): Promise<DeleteRowResponse> {
    return this.dataService.deleteRow(connectionId, schema, table, rowId);
  }

  /**
   * Delete multiple rows by primary keys (batch delete)
   * POST /api/connections/:connectionId/db/tables/:schema/:table/rows/batch-delete
   */
  @Post('rows/batch-delete')
  @HttpCode(HttpStatus.OK)
  async deleteRows(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Body() body: BatchDeleteDto,
  ): Promise<DeleteRowResponse> {
    return this.dataService.deleteRows(connectionId, schema, table, body);
  }

  /**
   * Update multiple rows by primary keys (batch update)
   * POST /api/connections/:connectionId/db/tables/:schema/:table/rows/batch-update
   */
  @Post('rows/batch-update')
  @HttpCode(HttpStatus.OK)
  async updateRows(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Body() body: BatchUpdateDto,
  ): Promise<BatchUpdateResponse> {
    return this.dataService.updateRows(connectionId, schema, table, {
      rowIds: body.rowIds,
      updates: body.updates,
    });
  }

  /**
   * Insert a new row
   * POST /api/connections/:connectionId/db/tables/:schema/:table/row
   */
  @Post('row')
  @HttpCode(HttpStatus.OK)
  async insertRow(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Body() dto: InsertRowDto,
  ): Promise<InsertRowResponse> {
    return this.dataService.insertRow(connectionId, schema, table, dto.data);
  }

  /**
   * Update a single row by primary key
   * PUT /api/connections/:connectionId/db/tables/:schema/:table/row/:rowId
   */
  @Put('row/:rowId')
  @HttpCode(HttpStatus.OK)
  async updateRow(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Param('rowId') rowId: string,
    @Body() dto: UpdateRowDto,
  ): Promise<UpdateRowResponse> {
    return this.dataService.updateRow(connectionId, schema, table, rowId, dto.data);
  }
}

