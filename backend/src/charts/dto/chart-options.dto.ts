import { IsEnum, IsString, IsArray, IsOptional, IsNumber, IsIn, Min, Max } from 'class-validator';

export enum ChartTypeEnum {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  SCATTER = 'scatter',
  HISTOGRAM = 'histogram',
  TIMESERIES = 'timeseries',
}

export enum AggregationFunctionEnum {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
}

export enum TimeGroupingEnum {
  HOUR = 'hour',
  MINUTE = 'minute',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

class FilterRuleDto {
  @IsString()
  column: string;

  @IsString()
  @IsIn(['equals', 'not_equals', 'contains', 'starts_with', 'ends_with', 'gt', 'lt', 'gte', 'lte'])
  operator: string;

  @IsString()
  value: string;
}

export class ChartOptionsDto {
  @IsEnum(ChartTypeEnum)
  chartType: ChartTypeEnum;

  @IsString()
  xAxisColumn: string;

  @IsArray()
  @IsString({ each: true })
  yAxisColumns: string[];

  @IsOptional()
  @IsEnum(AggregationFunctionEnum)
  aggregation?: AggregationFunctionEnum;

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsEnum(TimeGroupingEnum)
  timeGrouping?: TimeGroupingEnum;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number;

  @IsOptional()
  @IsArray()
  filters?: FilterRuleDto[];
}




