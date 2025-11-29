import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { foreignKeysService } from "@/lib/api/services/foreign-keys.service";
import type { Table } from "@/lib/api/types";

interface ForeignKeyCellProps {
  value: any;
  columnName: string;
  connectionId: string;
  schema: string;
  table: Table;
}

export const ForeignKeyCell = ({ 
  value, 
  columnName, 
  connectionId,
  schema,
  table,
}: ForeignKeyCellProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  // Find the foreign key relationship for this column
  const foreignKey = table.foreignKeys.find((fk) => fk.columns.includes(columnName));
  
  if (!foreignKey) {
    return <span className="truncate">{String(value)}</span>;
  }

  // Navigate to the referenced table when clicked
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!value || value === null) {
      return;
    }

    try {
      // Use FK lookup to get the referenced table info (including schema)
      const lookup = await foreignKeysService.lookupByForeignKey(
        connectionId,
        schema,
        table.name,
        {
          foreignKeyName: foreignKey.name,
          foreignKeyValue: String(value),
        },
      );

      if (lookup.found && lookup.table) {
        // Navigate to the referenced table with schema.table format
        const targetTableId = `${lookup.table.schema}.${lookup.table.name}`;
        navigate(`/table/${targetTableId}`);
      } else {
        // If lookup fails, try navigating to the referenced table directly (assuming same schema)
        // This handles cases where the referenced row doesn't exist but we still want to navigate
        const targetTableId = `${schema}.${foreignKey.referencedTable}`;
        navigate(`/table/${targetTableId}`);
      }
    } catch (error: any) {
      console.error("FK navigation error:", error);
      // Fallback: navigate to referenced table assuming same schema
      const targetTableId = `${schema}.${foreignKey.referencedTable}`;
      navigate(`/table/${targetTableId}`);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="flex items-center gap-2 group/fk cursor-pointer"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
        >
          <span className="text-primary underline decoration-dotted underline-offset-2 truncate font-medium">
            {String(value)}
          </span>
          <ExternalLink 
            className={`w-3 h-3 text-primary flex-shrink-0 transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-semibold text-xs">Foreign Key Reference</p>
          <p className="text-xs text-muted-foreground">
            → {foreignKey.referencedTable}.{foreignKey.referencedColumns.join(", ")}
          </p>
          <p className="text-xs text-primary">Click to navigate</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
