import { IsEnum, IsOptional, IsBoolean, IsString } from 'class-validator';
import { ExportFormat } from './table-export-query.dto';
import { ExecuteQueryDto } from '../../queries/dto/execute-query.dto';

export class QueryExportDto extends ExecuteQueryDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsBoolean()
  includeHeaders?: boolean = true;
}

