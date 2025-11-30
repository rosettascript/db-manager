import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { IndexRecommendationsService } from './index-recommendations.service';
import {
  IndexAnalysisResponse,
  IndexRecommendation,
  IndexUsageStat,
  QueryPattern,
} from './interfaces/index-recommendations.interface';

@Controller('connections/:connectionId/index-recommendations')
export class IndexRecommendationsController {
  constructor(
    private readonly indexRecommendationsService: IndexRecommendationsService,
  ) {}

  /**
   * Get comprehensive index analysis
   * GET /api/connections/:connectionId/index-recommendations/analysis
   */
  @Get('analysis')
  async getIndexAnalysis(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema?: string,
  ): Promise<IndexAnalysisResponse> {
    return this.indexRecommendationsService.getIndexAnalysis(
      connectionId,
      schema,
    );
  }

  /**
   * Get index recommendations
   * GET /api/connections/:connectionId/index-recommendations/suggestions
   */
  @Get('suggestions')
  async getSuggestions(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema?: string,
  ): Promise<IndexRecommendation[]> {
    return this.indexRecommendationsService.suggestMissingIndexes(
      connectionId,
      schema,
    );
  }

  /**
   * Get index usage statistics
   * GET /api/connections/:connectionId/index-recommendations/usage-stats
   */
  @Get('usage-stats')
  async getUsageStats(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema?: string,
  ): Promise<IndexUsageStat[]> {
    return this.indexRecommendationsService.getIndexUsageStats(
      connectionId,
      schema,
    );
  }

  /**
   * Analyze query patterns
   * GET /api/connections/:connectionId/index-recommendations/query-patterns
   */
  @Get('query-patterns')
  async getQueryPatterns(
    @Param('connectionId') connectionId: string,
    @Query('limit') limit?: number,
  ): Promise<QueryPattern[]> {
    return this.indexRecommendationsService.analyzeQueryPatterns(
      connectionId,
      limit ? parseInt(String(limit)) : 1000,
    );
  }

  /**
   * Generate CREATE INDEX statement
   * GET /api/connections/:connectionId/index-recommendations/generate-statement
   */
  @Get('generate-statement')
  async generateStatement(
    @Param('connectionId') connectionId: string,
    @Query('schema') schema: string,
    @Query('table') table: string,
    @Query('columns') columns: string,
    @Query('indexName') indexName?: string,
    @Query('unique') unique?: boolean,
  ): Promise<{ statement: string }> {
    const columnsArray = columns.split(',').map((c) => c.trim());
    const statement = this.indexRecommendationsService.generateCreateIndexStatement(
      schema,
      table,
      columnsArray,
      indexName,
      unique === true,
    );

    return { statement };
  }
}

