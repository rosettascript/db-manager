import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { SchemasService } from '../schemas/schemas.service';
import {
  ForeignKeyLookupResponse,
  RowLookupResponse,
  ForeignKeyLookupRequest,
} from './interfaces/foreign-key.interface';
import { ForeignKey } from '../schemas/interfaces/schema.interface';

@Injectable()
export class ForeignKeysService {
  private readonly logger = new Logger(ForeignKeysService.name);

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly schemasService: SchemasService,
  ) {}

  /**
   * Get a specific row by primary key
   */
  async getRowById(
    connectionId: string,
    schema: string,
    table: string,
    id: string,
  ): Promise<RowLookupResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      // Get table details to find primary key
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Find primary key columns
      const primaryKeyColumns = tableDetails.columns
        .filter((col) => col.isPrimaryKey)
        .map((col) => col.name);

      if (primaryKeyColumns.length === 0) {
        return {
          found: false,
          error: 'Table does not have a primary key',
        };
      }

      // If multiple PK columns, split the ID value
      let whereConditions: string[];
      let params: any[];

      if (primaryKeyColumns.length === 1) {
        // Single primary key
        whereConditions = [`"${primaryKeyColumns[0]}" = $1`];
        params = [this.parseIdValue(id)];
      } else {
        // Composite primary key - expect comma-separated values
        const idValues = String(id).split(',');
        if (idValues.length !== primaryKeyColumns.length) {
          return {
            found: false,
            error: `Expected ${primaryKeyColumns.length} values for composite key, got ${idValues.length}`,
          };
        }

        params = idValues.map((val) => this.parseIdValue(val.trim()));
        whereConditions = primaryKeyColumns.map((col, idx) => {
          return `"${col}" = $${idx + 1}`;
        });
      }

      const whereClause = whereConditions.join(' AND ');
      const query = `SELECT * FROM "${schema}"."${table}" WHERE ${whereClause} LIMIT 1`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return {
          found: false,
        };
      }

      // Format row data
      const row: Record<string, any> = {};
      for (const [key, value] of Object.entries(result.rows[0])) {
        row[key] = value === null ? null : value;
      }

      return {
        found: true,
        row,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get row by ID for ${schema}.${table}: ${error.message}`,
      );
      return {
        found: false,
        error: error.message || 'Failed to lookup row',
      };
    }
  }

  /**
   * Lookup a row by foreign key value
   */
  async lookupByForeignKey(
    connectionId: string,
    schema: string,
    table: string,
    lookupRequest: ForeignKeyLookupRequest,
  ): Promise<ForeignKeyLookupResponse> {
    const pool = this.connectionManager.getPool(connectionId);
    if (!pool) {
      throw new NotFoundException(
        `Connection ${connectionId} not found or not connected`,
      );
    }

    try {
      // Get table details to find the foreign key
      const tableDetails = await this.schemasService.getTableDetails(
        connectionId,
        schema,
        table,
      );

      // Find the foreign key by name
      const foreignKey = tableDetails.foreignKeys.find(
        (fk) => fk.name === lookupRequest.foreignKeyName,
      );

      if (!foreignKey) {
        return {
          found: false,
          table: { schema, name: table },
          error: `Foreign key ${lookupRequest.foreignKeyName} not found`,
        };
      }

      // Prepare FK values (single or array)
      const fkValues = Array.isArray(lookupRequest.foreignKeyValue)
        ? lookupRequest.foreignKeyValue
        : [lookupRequest.foreignKeyValue];

      if (fkValues.length !== foreignKey.columns.length) {
        return {
          found: false,
          table: { schema, name: table },
          error: `Expected ${foreignKey.columns.length} values for composite FK, got ${fkValues.length}`,
        };
      }

      // Build query to find the referenced row
      // Note: We assume same schema for now - could be enhanced to detect actual schema from FK metadata
      const referencedSchema = schema;
      const params = fkValues.map((val) => this.parseIdValue(val.trim()));
      const whereConditions = foreignKey.referencedColumns.map((col, idx) => {
        return `"${col}" = $${idx + 1}`;
      });

      const whereClause = whereConditions.join(' AND ');
      const query = `SELECT * FROM "${referencedSchema}"."${foreignKey.referencedTable}" WHERE ${whereClause} LIMIT 1`;

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return {
          found: false,
          table: {
            schema: referencedSchema,
            name: foreignKey.referencedTable,
          },
        };
      }

      // Format row data
      const row: Record<string, any> = {};
      for (const [key, value] of Object.entries(result.rows[0])) {
        row[key] = value === null ? null : value;
      }

      return {
        found: true,
        table: {
          schema: referencedSchema,
          name: foreignKey.referencedTable,
        },
        row,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to lookup by FK for ${schema}.${table}: ${error.message}`,
      );
      return {
        found: false,
        table: { schema, name: table },
        error: error.message || 'Failed to lookup by foreign key',
      };
    }
  }

  /**
   * Parse ID value - handle UUID, integers, strings
   */
  private parseIdValue(value: string): any {
    // Try to parse as UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(value)) {
      return value;
    }

    // Try to parse as number
    const numValue = Number(value);
    if (!isNaN(numValue) && value.trim() !== '') {
      return numValue;
    }

    // Return as string
    return value.trim();
  }
}

