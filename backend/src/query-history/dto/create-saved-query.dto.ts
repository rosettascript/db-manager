import { IsString, IsOptional, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateSavedQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(1)
  query: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

