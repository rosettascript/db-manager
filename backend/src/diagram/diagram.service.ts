import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConnectionManagerService } from '../common/database/connection-manager.service';
import { SchemasService } from '../schemas/schemas.service';
import {
  DiagramNode,
  DiagramEdge,
  DiagramResponse,
  RelationshipResponse,
} from './interfaces/diagram.interface';
import { Table, ForeignKey } from '../schemas/interfaces/schema.interface';

@Injectable()
export class DiagramService {
  private readonly logger = new Logger(DiagramService.name);

  constructor(
    private readonly connectionManager: ConnectionManagerService,
    private readonly schemasService: SchemasService,
  ) {}

  /**
   * Get ER diagram data (nodes + edges)
   */
  async getDiagram(
    connectionId: string,
    options: {
      schemas?: string[];
      showIsolatedTables?: boolean;
    } = {},
  ): Promise<DiagramResponse> {
    // Get all tables
    const allTables = await this.schemasService.getTables(
      connectionId,
      options.schemas?.[0], // If single schema filter, use it
    );

    // Filter by schemas if specified
    let tables = allTables;
    if (options.schemas && options.schemas.length > 0) {
      tables = allTables.filter((table) =>
        options.schemas!.includes(table.schema),
      );
    }

    // Build table map for quick lookup
    const tableMap = new Map<string, Table>();
    tables.forEach((table) => {
      tableMap.set(this.getTableId(table.schema, table.name), table);
    });

    // Identify isolated tables (no relationships)
    const isolatedTableIds = new Set<string>();
    if (!options.showIsolatedTables) {
      const connectedTableIds = new Set<string>();
      
      tables.forEach((table) => {
        const tableId = this.getTableId(table.schema, table.name);
        
        // Check outgoing FKs
        table.foreignKeys.forEach((fk) => {
          const targetId = this.getTableId(
            table.schema, // Assume same schema for now
            fk.referencedTable,
          );
          if (tableMap.has(targetId)) {
            connectedTableIds.add(tableId);
            connectedTableIds.add(targetId);
          }
        });
      });

      // Find tables with incoming FKs
      tables.forEach((table) => {
        const tableId = this.getTableId(table.schema, table.name);
        tables.forEach((otherTable) => {
          if (otherTable.foreignKeys) {
            otherTable.foreignKeys.forEach((fk) => {
              if (fk.referencedTable === table.name) {
                connectedTableIds.add(tableId);
              }
            });
          }
        });
      });

      // Mark isolated tables
      tableMap.forEach((_, tableId) => {
        if (!connectedTableIds.has(tableId)) {
          isolatedTableIds.add(tableId);
        }
      });
    }

    // Filter out isolated tables if needed
    const visibleTables = tables.filter((table) => {
      const tableId = this.getTableId(table.schema, table.name);
      return !isolatedTableIds.has(tableId);
    });

    // Build nodes
    const nodes: DiagramNode[] = [];
    visibleTables.forEach((table, index) => {
      const tableId = this.getTableId(table.schema, table.name);

      // Calculate grid position (can be improved with better layout algorithms)
      const cols = Math.ceil(Math.sqrt(visibleTables.length));
      const row = Math.floor(index / cols);
      const col = index % cols;

      nodes.push({
        id: tableId,
        type: 'tableNode',
        position: {
          x: 100 + col * 400,
          y: 100 + row * 350,
        },
        data: {
          table: {
            id: tableId, // Use schema.table format as ID
            name: table.name,
            schema: table.schema,
            rowCount: table.rowCount,
            size: table.size,
            columns: table.columns.map((col) => ({
              name: col.name,
              type: col.type,
              nullable: col.nullable,
              defaultValue: col.defaultValue,
              isPrimaryKey: col.isPrimaryKey,
              isForeignKey: col.isForeignKey,
            })),
            indexes: table.indexes || [],
            foreignKeys: table.foreignKeys || [],
          },
          isHighlighted: false,
        },
      });
    });

    // Build edges from foreign keys
    const edges: DiagramEdge[] = [];
    const edgeSet = new Set<string>(); // Prevent duplicate edges

    visibleTables.forEach((table) => {
      const sourceId = this.getTableId(table.schema, table.name);

      table.foreignKeys.forEach((fk) => {
        // Try to find referenced table (check same schema first, then other schemas)
        let targetId: string | null = null;
        let targetTable: Table | null = null;

        // Check same schema first
        const sameSchemaTargetId = this.getTableId(table.schema, fk.referencedTable);
        if (tableMap.has(sameSchemaTargetId)) {
          targetId = sameSchemaTargetId;
          targetTable = tableMap.get(sameSchemaTargetId)!;
        } else {
          // Check other schemas
          tableMap.forEach((t, tid) => {
            if (t.name === fk.referencedTable) {
              targetId = tid;
              targetTable = t;
            }
          });
        }

        if (targetId && targetTable && !isolatedTableIds.has(targetId)) {
          // Build edge ID from source, target, and FK columns
          const edgeId = `${sourceId}-${targetId}-${fk.columns.join(',')}`;
          
          // Prevent duplicate edges
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            
            edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              type: 'smoothstep',
              animated: false,
              label: fk.columns.join(', '),
              labelStyle: { fontSize: 10, fontWeight: 500 },
              style: {
                stroke: 'hsl(var(--primary))',
                strokeWidth: 2,
                opacity: 0.6,
              },
              markerEnd: {
                type: 'arrowclosed',
                color: 'hsl(var(--primary))',
              },
            });
          }
        }
      });
    });

    return { nodes, edges };
  }

  /**
   * Get relationships for a specific table
   */
  async getTableRelationships(
    connectionId: string,
    schema: string,
    table: string,
  ): Promise<RelationshipResponse> {
    // Get table details
    const tableDetails = await this.schemasService.getTableDetails(
      connectionId,
      schema,
      table,
    );

    // Get all tables to find incoming relationships
    const allTables = await this.schemasService.getTables(connectionId);

    // Build outgoing relationships (foreign keys from this table)
    const outgoing = tableDetails.foreignKeys.map((fk) => ({
      constraintName: fk.name,
      columns: fk.columns,
      referencedSchema: schema, // Could be enhanced to detect actual schema
      referencedTable: fk.referencedTable,
      referencedColumns: fk.referencedColumns,
    }));

    // Build incoming relationships (tables that reference this table)
    const incoming: RelationshipResponse['incoming'] = [];
    
    for (const otherTable of allTables) {
      if (otherTable.foreignKeys && otherTable.foreignKeys.length > 0) {
        otherTable.foreignKeys.forEach((fk) => {
          // Check if this FK references the target table
          if (fk.referencedTable === table) {
            incoming.push({
              constraintName: fk.name,
              schema: otherTable.schema,
              table: otherTable.name,
              columns: fk.columns,
              referencedColumns: fk.referencedColumns,
            });
          }
        });
      }
    }

    return { outgoing, incoming };
  }

  /**
   * Generate a unique table ID
   */
  private getTableId(schema: string, table: string): string {
    return `${schema}.${table}`;
  }
}

