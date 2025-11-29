import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @IsString()
  @IsNotEmpty()
  database: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  @IsIn(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'])
  sslMode?: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
}

