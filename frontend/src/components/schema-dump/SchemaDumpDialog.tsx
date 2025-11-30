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
import { Loader2, Download, Eye } from "lucide-react";
import { schemaDumpService, type SchemaDumpFormat } from "@/lib/api/services/schema-dump.service";
import { downloadSQLFile, downloadTextFile } from "@/lib/utils/file-download";
import { SchemaDumpViewer } from "./SchemaDumpViewer";
import { toast } from "sonner";

interface SchemaDumpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
}

export const SchemaDumpDialog = ({
  open,
  onOpenChange,
  connectionId,
}: SchemaDumpDialogProps) => {
  const [format, setFormat] = useState<SchemaDumpFormat>("sql");
  const [includeDrops, setIncludeDrops] = useState(true);
  const [includeGrants, setIncludeGrants] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generatedSQL, setGeneratedSQL] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);

  const handleGenerate = async () => {
    if (!connectionId) {
      toast.error("No connection selected");
      return;
    }

    setLoading(true);
    try {
      const sql = await schemaDumpService.getSchemaDump(connectionId, {
        format,
        includeDrops,
        includeGrants,
        includeComments,
      });

      setGeneratedSQL(sql);

      if (format === "sql" || format === "txt") {
        // Auto-download if format is SQL or TXT
        if (format === "sql") {
          downloadSQLFile(sql, `schema-dump-${Date.now()}.sql`);
          toast.success("Schema dump downloaded as SQL file");
        } else {
          downloadTextFile(sql, `schema-dump-${Date.now()}.txt`);
          toast.success("Schema dump downloaded as text file");
        }
        onOpenChange(false);
      } else {
        // Show viewer for JSON format or if user wants to view
        setShowViewer(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate schema dump");
    } finally {
      setLoading(false);
    }
  };

  const handleViewInEditor = async () => {
    if (generatedSQL) {
      setShowViewer(true);
      return;
    }

    if (!connectionId) {
      toast.error("No connection selected");
      return;
    }

    setLoading(true);
    try {
      const sql = await schemaDumpService.getSchemaDump(connectionId, {
        format: "sql",
        includeDrops,
        includeGrants,
        includeComments,
      });

      setGeneratedSQL(sql);
      setShowViewer(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate schema dump");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedSQL) return;

    if (format === "sql") {
      downloadSQLFile(generatedSQL, `schema-dump-${Date.now()}.sql`);
      toast.success("Schema dump downloaded as SQL file");
    } else {
      downloadTextFile(generatedSQL, `schema-dump-${Date.now()}.txt`);
      toast.success("Schema dump downloaded as text file");
    }
  };

  if (showViewer && generatedSQL) {
    return (
      <Dialog 
        open={open} 
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowViewer(false);
            setGeneratedSQL(null);
          }
          onOpenChange(isOpen);
        }}
      >
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 [&>button]:right-2 [&>button]:top-2 [&>button]:z-10">
          <SchemaDumpViewer
            sql={generatedSQL}
            filename={`schema-dump-${Date.now()}.sql`}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Database Schema</DialogTitle>
          <DialogDescription>
            Generate a complete SQL dump of your database schema including tables, indexes, functions, views, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as SchemaDumpFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sql" id="format-sql" />
                <Label htmlFor="format-sql" className="font-normal cursor-pointer">
                  SQL File (.sql)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="txt" id="format-txt" />
                <Label htmlFor="format-txt" className="font-normal cursor-pointer">
                  Text File (.txt)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="format-json" />
                <Label htmlFor="format-json" className="font-normal cursor-pointer">
                  View in Editor
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-drops"
                  checked={includeDrops}
                  onCheckedChange={(checked) => setIncludeDrops(checked === true)}
                />
                <Label htmlFor="include-drops" className="font-normal cursor-pointer">
                  Include DROP statements (DROP TABLE IF EXISTS, etc.)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-grants"
                  checked={includeGrants}
                  onCheckedChange={(checked) => setIncludeGrants(checked === true)}
                />
                <Label htmlFor="include-grants" className="font-normal cursor-pointer">
                  Include GRANT statements (permissions)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-comments"
                  checked={includeComments}
                  onCheckedChange={(checked) => setIncludeComments(checked === true)}
                />
                <Label htmlFor="include-comments" className="font-normal cursor-pointer">
                  Include COMMENT statements
                </Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {format === "json" && (
              <Button
                variant="outline"
                onClick={handleViewInEditor}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    View in Editor
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {format === "json" ? "Generate & View" : "Generate & Download"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

