import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ChartsService } from './charts.service';
import { ChartOptionsDto } from './dto/chart-options.dto';
import { ChartDataResponse } from './interfaces/chart.interface';

@Controller('connections/:connectionId/db/tables/:schema/:table/charts')
export class ChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  /**
   * Get chart data for a table
   * POST /api/connections/:connectionId/db/tables/:schema/:table/charts/data
   */
  @Post('data')
  @HttpCode(HttpStatus.OK)
  async getTableChartData(
    @Param('connectionId') connectionId: string,
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Body() dto: ChartOptionsDto,
  ): Promise<ChartDataResponse> {
    return this.chartsService.getTableChartData(
      connectionId,
      schema,
      table,
      dto,
    );
  }
}

@Controller('connections/:connectionId/query/charts')
export class QueryChartsController {
  constructor(private readonly chartsService: ChartsService) {}

  /**
   * Get chart data from query results
   * POST /api/connections/:connectionId/query/charts/data
   * Body should contain: { queryResults: any[], options: ChartOptionsDto }
   */
  @Post('data')
  @HttpCode(HttpStatus.OK)
  async getQueryChartData(
    @Param('connectionId') connectionId: string,
    @Body()
    body: {
      queryResults: any[];
      options: ChartOptionsDto;
    },
  ): Promise<ChartDataResponse> {
    return this.chartsService.getQueryChartData(
      connectionId,
      body.queryResults,
      body.options,
    );
  }
}











