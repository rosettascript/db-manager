import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { QueriesService } from './queries.service';
import { ExecuteQueryDto } from './dto/execute-query.dto';
import {
  QueryExecutionResponse,
  ExplainPlanResponse,
  QueryValidationResult,
  QueryOptimizationResult,
} from './interfaces/query.interface';

@Controller('connections/:connectionId/query')
export class QueriesController {
  constructor(private readonly queriesService: QueriesService) {}

  /**
   * Execute a SQL query
   * POST /api/connections/:connectionId/query
   */
  @Post()
  async executeQuery(
    @Param('connectionId') connectionId: string,
    @Body() dto: ExecuteQueryDto,
  ): Promise<QueryExecutionResponse> {
    return this.queriesService.executeQuery(connectionId, dto);
  }

  /**
   * Get explain plan for a query
   * POST /api/connections/:connectionId/query/explain
   */
  @Post('explain')
  async explainQuery(
    @Param('connectionId') connectionId: string,
    @Body() dto: { query: string; analyze?: boolean; parameters?: Record<string, any> },
  ): Promise<ExplainPlanResponse> {
    return this.queriesService.explainQuery(
      connectionId,
      dto.query,
      dto.analyze || false,
      dto.parameters,
    );
  }

  /**
   * Cancel a running query
   * POST /api/connections/:connectionId/query/cancel
   */
  @Post('cancel')
  async cancelQuery(
    @Param('connectionId') connectionId: string,
    @Body() body: { queryId: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.queriesService.cancelQuery(connectionId, body.queryId);
  }

  /**
   * Validate query syntax
   * POST /api/connections/:connectionId/query/validate
   */
  @Post('validate')
  async validateQuery(
    @Param('connectionId') connectionId: string,
    @Body() body: { query: string },
  ): Promise<QueryValidationResult> {
    return this.queriesService.validateQuery(connectionId, body.query);
  }

  /**
   * Optimize query and get recommendations
   * POST /api/connections/:connectionId/query/optimize
   */
  @Post('optimize')
  async optimizeQuery(
    @Param('connectionId') connectionId: string,
    @Body() body: { query: string; analyze?: boolean },
  ): Promise<QueryOptimizationResult> {
    return this.queriesService.optimizeQuery(
      connectionId,
      body.query,
      body.analyze || false,
    );
  }
}

