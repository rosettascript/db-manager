import { IsArray, IsString, ArrayNotEmpty, ArrayMaxSize, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ExportFormat } from './table-export-query.dto';

/**
 * DTO for bulk export request
 */
export class BulkExportDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10000, { message: 'Cannot export more than 10,000 rows at once' })
  @IsString({ each: true })
  rowIds: string[]; // Array of row IDs (primary key values)

  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  includeHeaders?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedColumns?: string[]; // Optional: specific columns to export
}










