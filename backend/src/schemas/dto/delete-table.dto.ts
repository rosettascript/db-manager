import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteTableDto {
  @IsBoolean()
  @IsOptional()
  cascade?: boolean = false;

  @IsString()
  @IsOptional()
  confirmName?: string; // Type-to-confirm: user must type table name
}

