import { IsString, IsNotEmpty, ValidateIf, IsArray } from 'class-validator';

export class ForeignKeyLookupDto {
  @IsString()
  @IsNotEmpty()
  foreignKeyName: string;

  @ValidateIf((o) => !o.foreignKeyValues)
  @IsString()
  @IsNotEmpty()
  foreignKeyValue?: string;

  @ValidateIf((o) => !o.foreignKeyValue)
  @IsArray()
  @IsString({ each: true })
  foreignKeyValues?: string[];
}

