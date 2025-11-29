/**
 * API Test Page
 * 
 * Simple page to test the API foundation.
 * Visit /api-test to run the tests.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { testApiFoundation } from "@/lib/api/test-api";

export default function ApiTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    config: boolean;
    healthCheck: boolean;
    connectionsList: boolean;
    errorHandling: boolean;
  } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setTesting(true);
    setResults(null);
    setLogs([]);

    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args: any[]) => {
      originalLog(...args);
      addLog(args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '));
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addLog(`ERROR: ${args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')}`);
    };

    try {
      const testResults = await testApiFoundation();
      setResults(testResults);
    } catch (error: any) {
      addLog(`Test failed: ${error.message}`);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      setTesting(false);
    }
  };

  const allPassed = results && Object.values(results).every((v) => v === true);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>API Foundation Test</CardTitle>
          <CardDescription>
            Test the API foundation to verify connectivity and functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runTests}
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              "Run API Tests"
            )}
          </Button>

          {results && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  {results.config ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Configuration</span>
                </div>
                <div className="flex items-center gap-2">
                  {results.healthCheck ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Health Check</span>
                </div>
                <div className="flex items-center gap-2">
                  {results.connectionsList ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Connections List</span>
                </div>
                <div className="flex items-center gap-2">
                  {results.errorHandling ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span>Error Handling</span>
                </div>
              </div>

              {allPassed ? (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-800 dark:text-green-200 font-semibold">
                    🎉 All tests passed! API foundation is working correctly.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
                    ⚠️ Some tests failed. Please check the logs below.
                  </p>
                </div>
              )}
            </div>
          )}

          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Logs:</h3>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm font-mono whitespace-pre-wrap">
                  {logs.join('\n')}
                </pre>
              </div>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Note:</strong> Make sure the backend server is running on{" "}
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                http://localhost:3000
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

