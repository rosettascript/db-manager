import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { QueryHistoryService } from './query-history.service';
import {
  QueryHistoryItem,
  SavedQuery,
} from './interfaces/query-history.interface';
import {
  CreateSavedQueryDto,
  UpdateSavedQueryDto,
} from './dto';

@Controller('connections/:connectionId')
export class QueryHistoryController {
  constructor(
    private readonly queryHistoryService: QueryHistoryService,
  ) {}

  /**
   * Get query history
   * GET /api/connections/:connectionId/query-history
   */
  @Get('query-history')
  async getHistory(
    @Param('connectionId') connectionId: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<QueryHistoryItem[]> {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.queryHistoryService.getHistory(connectionId, limitNum, search);
  }

  /**
   * Clear query history
   * DELETE /api/connections/:connectionId/query-history
   */
  @Delete('query-history')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearHistory(
    @Param('connectionId') connectionId: string,
  ): Promise<void> {
    return this.queryHistoryService.clearHistory(connectionId);
  }

  /**
   * Save a query
   * POST /api/connections/:connectionId/queries
   */
  @Post('queries')
  @HttpCode(HttpStatus.CREATED)
  async saveQuery(
    @Param('connectionId') connectionId: string,
    @Body() dto: CreateSavedQueryDto,
  ): Promise<SavedQuery> {
    return this.queryHistoryService.saveQuery(connectionId, dto);
  }

  /**
   * Get all saved queries
   * GET /api/connections/:connectionId/queries
   */
  @Get('queries')
  async getSavedQueries(
    @Param('connectionId') connectionId: string,
    @Query('search') search?: string,
  ): Promise<SavedQuery[]> {
    return this.queryHistoryService.getSavedQueries(connectionId, search);
  }

  /**
   * Get a single saved query
   * GET /api/connections/:connectionId/queries/:id
   */
  @Get('queries/:id')
  async getSavedQuery(
    @Param('connectionId') connectionId: string,
    @Param('id') id: string,
  ): Promise<SavedQuery> {
    return this.queryHistoryService.getSavedQuery(connectionId, id);
  }

  /**
   * Update a saved query
   * PUT /api/connections/:connectionId/queries/:id
   */
  @Put('queries/:id')
  async updateSavedQuery(
    @Param('connectionId') connectionId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavedQueryDto,
  ): Promise<SavedQuery> {
    return this.queryHistoryService.updateSavedQuery(connectionId, id, dto);
  }

  /**
   * Delete a saved query
   * DELETE /api/connections/:connectionId/queries/:id
   */
  @Delete('queries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedQuery(
    @Param('connectionId') connectionId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.queryHistoryService.deleteSavedQuery(connectionId, id);
  }
}

