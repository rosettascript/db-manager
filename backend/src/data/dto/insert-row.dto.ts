import { IsObject, ValidateNested } from 'class-validator';

export class InsertRowDto {
  @IsObject()
  data: Record<string, any>; // Column name -> value mapping
}









