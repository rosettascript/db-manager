import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteSchemaDto {
  @IsBoolean()
  @IsOptional()
  cascade?: boolean = false;

  @IsString()
  @IsOptional()
  confirmName?: string; // Type-to-confirm: user must type schema name
}

