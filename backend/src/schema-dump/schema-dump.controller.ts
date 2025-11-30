import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  Res,
  ParseEnumPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { SchemaDumpService } from './schema-dump.service';
import { SchemaDumpFormat } from './dto/schema-dump.dto';

@Controller('schema-dump')
export class SchemaDumpController {
  constructor(private readonly schemaDumpService: SchemaDumpService) {}

  @Get(':connectionId')
  async getSchemaDump(
    @Param('connectionId') connectionId: string,
    @Query('format', new DefaultValuePipe(SchemaDumpFormat.SQL), new ParseEnumPipe(SchemaDumpFormat)) format: SchemaDumpFormat,
    @Query('includeDrops', new DefaultValuePipe(true), ParseBoolPipe) includeDrops: boolean,
    @Query('includeGrants', new DefaultValuePipe(true), ParseBoolPipe) includeGrants: boolean,
    @Query('includeComments', new DefaultValuePipe(true), ParseBoolPipe) includeComments: boolean,
    @Res() res: Response,
  ) {
    if (!connectionId) {
      throw new BadRequestException('Connection ID is required');
    }

    const options = {
      includeDrops,
      includeGrants,
      includeComments,
    };

    try {
      const sql = await this.schemaDumpService.generateSchemaDump(
        connectionId,
        options,
      );

      // Return based on format
      if (format === SchemaDumpFormat.JSON) {
        return res.json({
          connectionId,
          sql,
          generatedAt: new Date().toISOString(),
          options,
        });
      }

      // For SQL and TXT, return as plain text
      const contentType = format === SchemaDumpFormat.TXT 
        ? 'text/plain' 
        : 'application/sql';
      
      res.setHeader('Content-Type', contentType);
      return res.send(sql);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate schema dump: ${error.message}`,
      );
    }
  }
}

