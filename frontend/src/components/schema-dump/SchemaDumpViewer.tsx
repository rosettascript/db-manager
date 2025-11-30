import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, Check } from "lucide-react";
import { downloadSQLFile, downloadTextFile } from "@/lib/utils/file-download";
import { toast } from "sonner";

interface SchemaDumpViewerProps {
  sql: string;
  filename?: string;
}

export const SchemaDumpViewer = ({
  sql,
  filename = "schema-dump.sql",
}: SchemaDumpViewerProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      toast.success("SQL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleDownloadSQL = () => {
    downloadSQLFile(sql, filename);
    toast.success("SQL file downloaded");
  };

  const handleDownloadTXT = () => {
    downloadTextFile(sql, filename.replace(/\.sql$/, ".txt"));
    toast.success("Text file downloaded");
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3 border-b pr-12 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Schema Dump SQL</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSQL}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download SQL
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTXT}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download TXT
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full overflow-auto bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4">
          <pre className="whitespace-pre-wrap break-words">{sql}</pre>
        </div>
      </CardContent>
    </Card>
  );
};

