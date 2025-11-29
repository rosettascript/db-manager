import { IsArray, IsString, ArrayNotEmpty, ArrayMaxSize } from 'class-validator';

/**
 * DTO for batch delete request
 */
export class BatchDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100, { message: 'Cannot delete more than 100 rows at once' })
  @IsString({ each: true })
  rowIds: string[];
}



