import { IsEnum, IsOptional, IsBoolean, IsArray, IsString, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export class FilterRuleDto {
  @IsString()
  column: string;

  @IsString()
  operator: string;

  @IsString()
  value: string;
}

export class SortOptionDto {
  @IsString()
  column: string;

  @IsEnum(['asc', 'desc'])
  direction: 'asc' | 'desc';
}

export class TableExportQueryDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  includeHeaders?: boolean = true;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterRuleDto)
  filters?: FilterRuleDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SortOptionDto)
  sort?: SortOptionDto;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  searchColumns?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedColumns?: string[];

  @IsOptional()
  limit?: number;
}

