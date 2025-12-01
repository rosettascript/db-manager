import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, List, Loader2, ExternalLink } from "lucide-react";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { ConnectionErrorHandler } from "@/components/error/ConnectionErrorHandler";

const EnumViewer = () => {
  const { enumId } = useParams();
  const navigate = useNavigate();
  const { activeConnection } = useConnection();
  const [copied, setCopied] = useState(false);

  // Parse enumId: "schema.enumName"
  const parsedEnum = useQuery({
    queryKey: ['parseEnum', enumId],
    queryFn: () => {
      if (!enumId) return null;
      const parts = enumId.split('.');
      if (parts.length < 2) return null;
      return {
        schema: parts[0],
        name: parts.slice(1).join('.'),
      };
    },
    enabled: !!enumId,
  });

  const { data: enumDetails, isLoading, error } = useQuery({
    queryKey: ['enumDetails', activeConnection?.id, parsedEnum.data],
    queryFn: () => {
      if (!activeConnection || !parsedEnum.data) throw new Error("Missing connection or enum data");
      return schemasService.getEnumDetails(
        activeConnection.id,
        parsedEnum.data.schema,
        parsedEnum.data.name,
      );
    },
    enabled: !!activeConnection && !!parsedEnum.data && activeConnection.status === 'connected',
  });

  const copyDefinition = () => {
    if (!enumDetails) return;
    const definition = `CREATE TYPE "${enumDetails.schema}"."${enumDetails.name}" AS ENUM (${enumDetails.values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ')});`;
    navigator.clipboard.writeText(definition);
    setCopied(true);
    toast.success("Enum definition copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
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

  if (error || !enumDetails) {
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
              <List className="w-6 h-6" />
              {enumDetails.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {enumDetails.schema}
            </p>
          </div>
          <Button onClick={copyDefinition} variant="outline" size="sm">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enum Information</CardTitle>
              <CardDescription>Details about the enum type</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Schema</label>
                  <p className="text-sm">{enumDetails.schema}</p>
                </div>
                {enumDetails.owner && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Owner</label>
                    <p className="text-sm">{enumDetails.owner}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Values ({enumDetails.values.length})</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {enumDetails.values.map((value, idx) => (
                      <Badge key={idx} variant="outline" className="font-mono">
                        {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {enumDetails.usedInTables && enumDetails.usedInTables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Used In Tables</CardTitle>
                <CardDescription>Columns that use this enum type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {enumDetails.usedInTables.map((usage, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {usage.tableSchema}.{usage.tableName}
                        </span>
                        <span className="text-sm text-muted-foreground">→</span>
                        <span className="text-sm font-mono">{usage.columnName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/table/${usage.tableSchema}.${usage.tableName}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Enum Definition
                  </CardTitle>
                  <CardDescription>The SQL statement that creates this enum</CardDescription>
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
                {`CREATE TYPE "${enumDetails.schema}"."${enumDetails.name}" AS ENUM (${enumDetails.values.map(v => `'${v.replace(/'/g, "''")}'`).join(', ')});`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnumViewer;

