import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Columns, Search, Eye, EyeOff } from "lucide-react";
import { Column } from "@/lib/mockData";

interface ColumnManagerProps {
  columns: Column[];
  visibleColumns: string[];
  onToggleColumn: (columnName: string) => void;
  onToggleAll: (visible: boolean) => void;
}

export const ColumnManager = ({
  columns,
  visibleColumns,
  onToggleColumn,
  onToggleAll,
}: ColumnManagerProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredColumns = columns.filter((col) =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allVisible = visibleColumns.length === columns.length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Columns className="w-4 h-4" />
          Columns ({visibleColumns.length}/{columns.length})
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Manage Columns</SheetTitle>
          <SheetDescription>
            Show or hide columns in the table view
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-sm font-medium">
              {allVisible ? "Hide All" : "Show All"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAll(!allVisible)}
              className="gap-2"
            >
              {allVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {allVisible ? "Hide All" : "Show All"}
            </Button>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {filteredColumns.map((column) => {
              const isVisible = visibleColumns.includes(column.name);
              return (
                <div
                  key={column.name}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => onToggleColumn(column.name)}
                >
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={() => onToggleColumn(column.name)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium truncate">
                        {column.name}
                      </span>
                      {column.isPrimaryKey && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          PK
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {column.type}
                    </p>
                  </div>
                  {isVisible ? (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
