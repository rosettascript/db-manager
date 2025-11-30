import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExportFormat, TableExportOptions, QueryExportOptions, FilterRule, SortOption } from "@/lib/api/types";

interface TableExportDialogProps {
  children?: React.ReactNode;
  connectionId: string;
  schema: string;
  table: string;
  tableName?: string;
  filters?: FilterRule[];
  sort?: SortOption;
  search?: string;
  selectedColumns?: string[];
  onExport?: () => void;
}

interface QueryExportDialogProps {
  children?: React.ReactNode;
  connectionId: string;
  query: string;
  onExport?: () => void;
}

type ExportDialogProps = TableExportDialogProps | QueryExportDialogProps;

const isTableExport = (props: ExportDialogProps): props is TableExportDialogProps => {
  return 'schema' in props && 'table' in props;
};

export const ExportDialog = (props: ExportDialogProps) => {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const isTable = isTableExport(props);
  
  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    const formatLabel = format === "csv" ? "CSV" : "JSON";
    
    try {
      const { exportService } = await import("@/lib/api/services/export.service");
      
      if (isTable) {
        const options: TableExportOptions = {
          format,
          includeHeaders,
          filters: props.filters,
          sort: props.sort,
          search: props.search,
          selectedColumns: props.selectedColumns,
        };
        
        toast.loading(`Exporting ${props.tableName || props.table} as ${formatLabel}...`, {
          id: 'export-toast',
        });
        
        await exportService.exportTableData(
          props.connectionId,
          props.schema,
          props.table,
          options,
        );
        
        toast.success("Export completed!", {
          id: 'export-toast',
          description: "File download started",
        });
        
        props.onExport?.();
      } else {
        const options: QueryExportOptions = {
          format,
          includeHeaders,
          query: props.query,
        };
        
        toast.loading(`Exporting query results as ${formatLabel}...`, {
          id: 'export-toast',
        });
        
        await exportService.exportQueryResults(props.connectionId, options);
        
        toast.success("Export completed!", {
          id: 'export-toast',
          description: "File download started",
        });
        
        props.onExport?.();
      }
      
      setOpen(false);
    } catch (error: any) {
      toast.error("Export failed", {
        id: 'export-toast',
        description: error.message || "An error occurred during export",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {props.children || (
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
          <DialogDescription>
            Choose your export format and options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-base mb-3 block">Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-muted-foreground">
                        Comma-separated values
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileJson className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-muted-foreground">
                        Array of objects
                      </div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-base">Options</Label>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="headers"
                checked={includeHeaders}
                onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)}
              />
              <Label htmlFor="headers" className="cursor-pointer">
                Include column headers
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="gap-2" disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
