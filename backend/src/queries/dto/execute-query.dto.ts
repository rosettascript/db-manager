import { IsString, IsOptional, IsInt, Min, Max, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExecuteQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxRows?: number = 1000; // Default max rows

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(300) // Max 5 minutes
  timeout?: number = 30; // Default 30 seconds

  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>; // Parameter values keyed by parameter name
}

