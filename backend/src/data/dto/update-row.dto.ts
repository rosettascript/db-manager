import { IsObject, ValidateNested } from 'class-validator';

export class UpdateRowDto {
  @IsObject()
  data: Record<string, any>; // Column name -> value mapping (excludes primary keys)
}










