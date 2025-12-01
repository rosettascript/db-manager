import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Hash, Loader2, ExternalLink } from "lucide-react";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { ConnectionErrorHandler } from "@/components/error/ConnectionErrorHandler";

const IndexViewer = () => {
  const { indexId } = useParams();
  const navigate = useNavigate();
  const { activeConnection } = useConnection();
  const [copied, setCopied] = useState(false);

  // Parse indexId: "schema.indexName"
  const parsedIndex = useQuery({
    queryKey: ['parseIndex', indexId],
    queryFn: () => {
      if (!indexId) return null;
      const parts = indexId.split('.');
      if (parts.length < 2) return null;
      return {
        schema: parts[0],
        name: parts.slice(1).join('.'),
      };
    },
    enabled: !!indexId,
  });

  const { data: indexDetails, isLoading, error } = useQuery({
    queryKey: ['indexDetails', activeConnection?.id, parsedIndex.data],
    queryFn: () => {
      if (!activeConnection || !parsedIndex.data) throw new Error("Missing connection or index data");
      return schemasService.getIndexDetails(
        activeConnection.id,
        parsedIndex.data.schema,
        parsedIndex.data.name,
      );
    },
    enabled: !!activeConnection && !!parsedIndex.data && activeConnection.status === 'connected',
  });

  const copyDefinition = () => {
    if (!indexDetails?.definition) return;
    navigator.clipboard.writeText(indexDetails.definition);
    setCopied(true);
    toast.success("Index definition copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const navigateToTable = () => {
    if (!indexDetails) return;
    navigate(`/table/${indexDetails.tableSchema}.${indexDetails.tableName}`);
  };

  if (!activeConnection) {
    return (
      <div className="p-6">
        <ErrorDisplay message="No active connection" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !indexDetails) {
    return (
      <div className="p-6">
        <ConnectionErrorHandler error={error} />
        <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Schema Browser
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate('/')} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Hash className="w-6 h-6" />
              {indexDetails.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {indexDetails.schema}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={navigateToTable} variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Table
            </Button>
            <Button onClick={copyDefinition} variant="outline" size="sm">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Index Information</CardTitle>
              <CardDescription>Details about the index</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Schema</label>
                  <p className="text-sm">{indexDetails.schema}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <p className="text-sm">{indexDetails.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Table</label>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={navigateToTable}
                  >
                    {indexDetails.tableSchema}.{indexDetails.tableName}
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unique</label>
                  <p className="text-sm">
                    {indexDetails.unique ? (
                      <Badge variant="default">Yes</Badge>
                    ) : (
                      <Badge variant="secondary">No</Badge>
                    )}
                  </p>
                </div>
                {indexDetails.size && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Size</label>
                    <p className="text-sm">{indexDetails.size}</p>
                  </div>
                )}
                {indexDetails.indexScans !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Usage</label>
                    <p className="text-sm">
                      {indexDetails.isUsed ? (
                        <Badge variant="default">
                          Used ({indexDetails.indexScans} scans)
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Used</Badge>
                      )}
                    </p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Columns</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {indexDetails.columns.map((col, idx) => (
                      <Badge key={idx} variant="outline">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="w-5 h-5" />
                    Index Definition
                  </CardTitle>
                  <CardDescription>The SQL statement that creates this index</CardDescription>
                </div>
                <Button onClick={copyDefinition} variant="outline" size="sm">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                {indexDetails.definition}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IndexViewer;

