import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { mockTables } from "@/lib/mockData";

interface ForeignKeyCellProps {
  value: any;
  columnName: string;
  tableName: string;
}

export const ForeignKeyCell = ({ value, columnName, tableName }: ForeignKeyCellProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  // Find the foreign key relationship
  const currentTable = mockTables.find((t) => t.name === tableName);
  const foreignKey = currentTable?.foreignKeys.find((fk) => fk.columns.includes(columnName));
  
  if (!foreignKey) {
    return <span className="truncate">{String(value)}</span>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/table/${foreignKey.referencedTable}`);
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
