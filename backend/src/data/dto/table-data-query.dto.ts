import { IsOptional, IsInt, IsString, IsIn, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class FilterRuleDto {
  @IsString()
  column: string;

  @IsString()
  @IsIn([
    'equals',
    'not_equals',
    'contains',
    'starts_with',
    'ends_with',
    'gt',
    'lt',
    'gte',
    'lte',
    'is_null',
    'is_not_null',
  ])
  operator: string;

  @IsString()
  @IsOptional()
  value?: string;
}

export class TableDataQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number = 100;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortColumn?: string;

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @IsString()
  columns?: string; // Comma-separated column names

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterRuleDto)
  filters?: FilterRuleDto[];
}

export class TableCountQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterRuleDto)
  filters?: FilterRuleDto[];
}

