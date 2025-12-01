import { IsArray, IsString, IsNotEmpty, ArrayNotEmpty, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for a single column update
 */
export class ColumnUpdateDto {
  @IsString()
  @IsNotEmpty()
  column: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

/**
 * DTO for batch update request
 */
export class BatchUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @ArrayMaxSize(100, { message: 'Cannot update more than 100 rows at once' })
  rowIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ColumnUpdateDto)
  updates: ColumnUpdateDto[];
}















