import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ExportFormat } from "@/lib/api/types";
import { exportService } from "@/lib/api/services/export.service";

interface BulkExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  schema: string;
  table: string;
  rowIds: string[];
  rowCount: number;
}

export const BulkExportDialog = ({
  open,
  onOpenChange,
  connectionId,
  schema,
  table,
  rowIds,
  rowCount,
}: BulkExportDialogProps) => {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting || rowIds.length === 0) return;
    
    setIsExporting(true);
    const formatLabel = format === "csv" ? "CSV" : "JSON";
    
    try {
      toast.loading(`Exporting ${rowCount} selected row${rowCount !== 1 ? 's' : ''} as ${formatLabel}...`, {
        id: 'bulk-export-toast',
      });
      
      await exportService.exportSelectedRows(
        connectionId,
        schema,
        table,
        rowIds,
        format,
        includeHeaders,
      );
      
      toast.success("Export completed!", {
        id: 'bulk-export-toast',
        description: "File download started",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Export failed", {
        id: 'bulk-export-toast',
        description: error.message || "An error occurred during export",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export {rowCount} Selected Row{rowCount !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Choose your export format and options for the selected rows
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-base mb-3 block">Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="gap-2" disabled={isExporting || rowIds.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {rowCount} Row{rowCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};









