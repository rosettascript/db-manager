import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Filter, Plus, X } from "lucide-react";
import type { Column, FilterRule } from "@/lib/api/types";

interface FilterRuleWithId extends FilterRule {
  id: string;
}

interface DataFiltersProps {
  columns: Column[];
  onApplyFilters: (filters: FilterRule[]) => void;
  initialFilters?: FilterRule[];
}

const operators = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "gte", label: "Greater Than or Equal" },
  { value: "lte", label: "Less Than or Equal" },
  { value: "is_null", label: "Is NULL" },
  { value: "is_not_null", label: "Is Not NULL" },
];

export const DataFilters = ({ columns, onApplyFilters, initialFilters = [] }: DataFiltersProps) => {
  const [filters, setFilters] = useState<FilterRuleWithId[]>(() => {
    // Initialize filters with IDs from initialFilters
    return initialFilters.map((f, idx) => ({
      ...f,
      id: `filter-${idx}-${Date.now()}`,
    }));
  });
  const [open, setOpen] = useState(false);

  // Sync with initialFilters when they change externally
  useEffect(() => {
    if (initialFilters.length === 0 && filters.length > 0) {
      setFilters([]);
    }
  }, [initialFilters.length]);

  const addFilter = () => {
    setFilters([
      ...filters,
      {
        id: Math.random().toString(36).substr(2, 9),
        column: columns[0]?.name || "",
        operator: "equals",
        value: "",
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, field: keyof FilterRuleWithId, value: string) => {
    setFilters(
      filters.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleApply = () => {
    // Convert filters with IDs to FilterRule (without id)
    const filtersWithoutId: FilterRule[] = filters.map(({ id, ...filter }) => filter);
    onApplyFilters(filtersWithoutId);
    setOpen(false);
  };

  const handleClear = () => {
    setFilters([]);
    onApplyFilters([]);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5">
              {filters.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Data</SheetTitle>
          <SheetDescription>
            Add conditions to filter table rows. Multiple filters use AND logic.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {filters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="mb-4">No filters applied</p>
              <Button onClick={addFilter} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Filter
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className="p-4 border rounded-lg space-y-3 relative"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>

                    <div>
                      <Label className="text-xs">Column</Label>
                      <Select
                        value={filter.column}
                        onValueChange={(value) =>
                          updateFilter(filter.id, "column", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map((col) => (
                            <SelectItem key={col.name} value={col.name}>
                              {col.name} ({col.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={filter.operator}
                        onValueChange={(value) =>
                          updateFilter(filter.id, "operator", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {!["is_null", "is_not_null"].includes(filter.operator) && (
                      <div>
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={filter.value}
                          onChange={(e) =>
                            updateFilter(filter.id, "value", e.target.value)
                          }
                          placeholder="Enter value..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button
                onClick={addFilter}
                variant="outline"
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Filter
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={filters.length === 0}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
