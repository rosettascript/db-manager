import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Check, Code2, FunctionSquare, Loader2, AlertCircle } from "lucide-react";
import { useConnection } from "@/contexts/ConnectionContext";
import { schemasService } from "@/lib/api/services/schemas.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { ErrorDisplay } from "@/components/error/ErrorDisplay";
import { ConnectionErrorHandler } from "@/components/error/ConnectionErrorHandler";
import { cn } from "@/lib/utils";

const FunctionViewer = () => {
  const { functionId } = useParams();
  const navigate = useNavigate();
  const { activeConnection } = useConnection();
  const [copied, setCopied] = useState(false);

  // Parse functionId: "schema.functionName(parameters)"
  const parsedFunction = useQuery({
    queryKey: ['parseFunction', functionId],
    queryFn: () => {
      if (!functionId) return null;
      const match = functionId.match(/^([^.]+)\.([^(]+)(?:\(([^)]*)\))?$/);
      if (!match) return null;
      return {
        schema: match[1],
        name: match[2],
        parameters: match[3] || undefined,
      };
    },
    enabled: !!functionId,
  });

  const { data: functionDetails, isLoading, error } = useQuery({
    queryKey: ['functionDetails', activeConnection?.id, parsedFunction.data],
    queryFn: () => {
      if (!activeConnection || !parsedFunction.data) throw new Error("Missing connection or function data");
      return schemasService.getFunctionDetails(
        activeConnection.id,
        parsedFunction.data.schema,
        parsedFunction.data.name,
        parsedFunction.data.parameters,
      );
    },
    enabled: !!activeConnection && !!parsedFunction.data && activeConnection.status === 'connected',
  });

  const copyDefinition = () => {
    if (!functionDetails?.definition) return;
    navigator.clipboard.writeText(functionDetails.definition);
    setCopied(true);
    toast.success("Function definition copied to clipboard");
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

  if (error || !functionDetails) {
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
              <FunctionSquare className="w-6 h-6" />
              {functionDetails.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {functionDetails.schema} • {functionDetails.language}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {functionDetails.category === 'extension' && (
              <Badge variant="secondary" title={functionDetails.extensionName}>
                Extension: {functionDetails.extensionName}
              </Badge>
            )}
            {functionDetails.category === 'system' && (
              <Badge variant="secondary">System Function</Badge>
            )}
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
              <CardTitle>Function Information</CardTitle>
              <CardDescription>Details about the function</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Schema</label>
                  <p className="text-sm">{functionDetails.schema}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Language</label>
                  <p className="text-sm">{functionDetails.language}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Return Type</label>
                  <p className="text-sm font-mono">{functionDetails.returnType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="text-sm">{functionDetails.owner}</p>
                </div>
                {functionDetails.parameters && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Parameters</label>
                    <p className="text-sm font-mono">{functionDetails.parameters}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Code2 className="w-5 h-5" />
                    Function Definition
                  </CardTitle>
                  <CardDescription>The complete SQL definition of the function</CardDescription>
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
                {functionDetails.definition}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FunctionViewer;

