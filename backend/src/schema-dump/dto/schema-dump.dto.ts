import { IsOptional, IsEnum } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SchemaDumpFormat {
  SQL = 'sql',
  TXT = 'txt',
  JSON = 'json',
}

// Helper function to convert string to boolean
function toBoolean(value: any): boolean {
  if (value === 'true' || value === true || value === '1') return true;
  if (value === 'false' || value === false || value === '0') return false;
  return value !== undefined && value !== null && value !== '';
}

export class SchemaDumpQueryDto {
  @IsOptional()
  @IsEnum(SchemaDumpFormat)
  format?: SchemaDumpFormat = SchemaDumpFormat.SQL;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  includeDrops?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  includeGrants?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  includeComments?: boolean = true;
}

