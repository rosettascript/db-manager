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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiagramFiltersProps {
  schemas: string[];
  selectedSchemas: string[];
  onToggleSchema: (schema: string) => void;
  showRelationships: boolean;
  onToggleRelationships: (show: boolean) => void;
  showIsolatedTables: boolean;
  onToggleIsolatedTables: (show: boolean) => void;
}

export const DiagramFilters = ({
  schemas,
  selectedSchemas,
  onToggleSchema,
  showRelationships,
  onToggleRelationships,
  showIsolatedTables,
  onToggleIsolatedTables,
}: DiagramFiltersProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSchemas = schemas.filter((schema) =>
    schema.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter Diagram
          {selectedSchemas.length < schemas.length && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5">
              {selectedSchemas.length}/{schemas.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Diagram Filters</SheetTitle>
          <SheetDescription>
            Control what is displayed in the ER diagram
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <Label className="text-base mb-3 block">Display Options</Label>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="relationships" className="text-sm font-normal">
                    Show Relationships
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Display foreign key relationship lines
                  </p>
                </div>
                <Switch
                  id="relationships"
                  checked={showRelationships}
                  onCheckedChange={onToggleRelationships}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isolated" className="text-sm font-normal">
                    Show Isolated Tables
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Display tables without relationships
                  </p>
                </div>
                <Switch
                  id="isolated"
                  checked={showIsolatedTables}
                  onCheckedChange={onToggleIsolatedTables}
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base mb-3 block">Schemas</Label>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search schemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredSchemas.map((schema) => {
                const isSelected = selectedSchemas.includes(schema);
                return (
                  <div
                    key={schema}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => onToggleSchema(schema)}
                  >
                    <Label className="cursor-pointer font-mono">
                      {schema}
                    </Label>
                    <Switch checked={isSelected} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
