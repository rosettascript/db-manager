import { Controller, Get, Param, Query } from '@nestjs/common';
import { ForeignKeysService } from './foreign-keys.service';
import {
  ForeignKeyLookupResponse,
  RowLookupResponse,
} from './interfaces/foreign-key.interface';
import { ForeignKeyLookupDto } from './dto/fk-lookup.dto';

@Controller('connections/:connectionId/db/tables/:schema/:table')
export class ForeignKeysController {
  constructor(private readonly foreignKeysService: ForeignKeysService) {}

  /**
   * Get a specific row by primary key
   * GET /api/connections/:connectionId/db/tables/:schema/:table/row/:id
   */
  @Get('row/:id')
  async getRowById(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Param('id') id: string,
  ): Promise<RowLookupResponse> {
    return this.foreignKeysService.getRowById(connectionId, schema, table, id);
  }

  /**
   * Lookup a row by foreign key value
   * GET /api/connections/:connectionId/db/tables/:schema/:table/fk-lookup?foreignKeyName=...&foreignKeyValue=...
   */
  @Get('fk-lookup')
  async lookupByForeignKey(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Query() query: ForeignKeyLookupDto,
  ): Promise<ForeignKeyLookupResponse> {
    // Support both single value and array for composite keys
    const foreignKeyValue = query.foreignKeyValues || query.foreignKeyValue;

    return this.foreignKeysService.lookupByForeignKey(connectionId, schema, table, {
      foreignKeyName: query.foreignKeyName,
      foreignKeyValue: Array.isArray(foreignKeyValue)
        ? foreignKeyValue
        : foreignKeyValue || '',
    });
  }
}

