import {
  Controller,
  Get,
  Param,
  Query,
  ParseBoolPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SearchService } from './search.service';
import {
  GlobalSearchResponse,
  ColumnSearchResponse,
  ColumnAutocompleteResult,
} from './interfaces/search.interface';

@Controller('connections/:connectionId/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Global search across tables, columns, and data
   * GET /api/connections/:connectionId/search/global
   */
  @Get('global')
  async globalSearch(
    @Param('connectionId') connectionId: string,
    @Query('q') query: string,
    @Query('searchTables', new DefaultValuePipe(true), ParseBoolPipe) searchTables?: boolean,
    @Query('searchColumnNames', new DefaultValuePipe(true), ParseBoolPipe) searchColumnNames?: boolean,
    @Query('searchDataValues', new DefaultValuePipe(true), ParseBoolPipe) searchDataValues?: boolean,
    @Query('schemas') schemas?: string,
    @Query('limit') limit?: number,
  ): Promise<GlobalSearchResponse> {
    const schemaList = schemas ? schemas.split(',').map((s) => s.trim()) : undefined;
    return this.searchService.globalSearch(connectionId, query, {
      searchTables,
      searchColumnNames,
      searchDataValues,
      schemas: schemaList,
      limit: limit ? parseInt(String(limit)) : undefined,
    });
  }

  /**
   * Find tables containing specific columns
   * GET /api/connections/:connectionId/search/columns
   */
  @Get('columns')
  async findTablesWithColumns(
    @Param('connectionId') connectionId: string,
    @Query('columns') columns: string,
    @Query('schemas') schemas?: string,
    @Query('matchAll', new DefaultValuePipe(false), ParseBoolPipe) matchAll?: boolean,
  ): Promise<ColumnSearchResponse> {
    const columnList = columns.split(',').map((c) => c.trim());
    const schemaList = schemas ? schemas.split(',').map((s) => s.trim()) : undefined;
    return this.searchService.findTablesWithColumns(connectionId, columnList, {
      schemas: schemaList,
      matchAll,
    });
  }

  /**
   * Column name autocomplete
   * GET /api/connections/:connectionId/search/autocomplete
   */
  @Get('autocomplete')
  async columnAutocomplete(
    @Param('connectionId') connectionId: string,
    @Query('q') query: string,
    @Query('schemas') schemas?: string,
    @Query('limit') limit?: number,
  ): Promise<ColumnAutocompleteResult[]> {
    const schemaList = schemas ? schemas.split(',').map((s) => s.trim()) : undefined;
    return this.searchService.columnAutocomplete(connectionId, query, {
      schemas: schemaList,
      limit: limit ? parseInt(String(limit)) : undefined,
    });
  }

  /**
   * Filter columns by data type and other criteria
   * GET /api/connections/:connectionId/search/columns-by-type
   */
  @Get('columns-by-type')
  async filterColumnsByType(
    @Param('connectionId') connectionId: string,
    @Query('dataTypes') dataTypes?: string,
    @Query('schemas') schemas?: string,
    @Query('nullable') nullable?: string,
    @Query('isPrimaryKey') isPrimaryKey?: string,
    @Query('isForeignKey') isForeignKey?: string,
  ): Promise<ColumnSearchResponse> {
    const dataTypeList = dataTypes ? dataTypes.split(',').map((t) => t.trim()) : undefined;
    const schemaList = schemas ? schemas.split(',').map((s) => s.trim()) : undefined;
    
    return this.searchService.filterColumnsByType(connectionId, dataTypeList || [], {
      schemas: schemaList,
      nullable: nullable !== undefined ? nullable === 'true' : undefined,
      isPrimaryKey: isPrimaryKey !== undefined ? isPrimaryKey === 'true' : undefined,
      isForeignKey: isForeignKey !== undefined ? isForeignKey === 'true' : undefined,
    });
  }
}

