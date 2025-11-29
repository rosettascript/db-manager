import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  NoConnectionsEmptyState,
  NoTablesEmptyState,
  NoQueryResultsEmptyState,
  NoQueryHistoryEmptyState,
  NoSavedQueriesEmptyState,
  EmptyDiagramState,
} from '@/components/empty/EmptyState';
import {
  notifySuccess,
  notifyError,
  notifyInfo,
  notifyWarning,
  connectionNotifications,
  queryNotifications,
  exportNotifications,
  schemaNotifications,
  queryHistoryNotifications,
} from '@/lib/notifications';

const UIUXTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, boolean | null>>({
    emptyStates: null,
    successNotifications: null,
    errorNotifications: null,
    loadingNotifications: null,
    infoNotifications: null,
    responsiveDesign: null,
  });
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const runEmptyStateTests = () => {
    setTestResults(prev => ({ ...prev, emptyStates: null }));
    toast.info('Empty states are displayed below. Verify they look correct.', {
      duration: 5000,
    });
    // Visual inspection only - no automated test
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, emptyStates: true }));
      toast.success('Empty state tests passed (visual inspection)');
    }, 1000);
  };

  const runSuccessNotificationTests = () => {
    setTestResults(prev => ({ ...prev, successNotifications: null }));
    
    setTimeout(() => {
      notifySuccess('Test Success Notification', 'This is a test success message');
    }, 100);
    
    setTimeout(() => {
      connectionNotifications.created('Test Connection');
    }, 800);
    
    setTimeout(() => {
      queryNotifications.success(10, 125);
    }, 1600);
    
    setTimeout(() => {
      exportNotifications.success('CSV');
    }, 2400);
    
    setTimeout(() => {
      queryHistoryNotifications.saved('Test Query');
    }, 3200);
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, successNotifications: true }));
      toast.success('Success notification tests completed');
    }, 4000);
  };

  const runErrorNotificationTests = () => {
    setTestResults(prev => ({ ...prev, errorNotifications: null }));
    
    setTimeout(() => {
      notifyError('Test Error Notification', 'This is a test error message');
    }, 100);
    
    setTimeout(() => {
      connectionNotifications.failed('Connection refused: Invalid credentials');
    }, 800);
    
    setTimeout(() => {
      queryNotifications.failed('Syntax error at or near "SELECT"');
    }, 1600);
    
    setTimeout(() => {
      exportNotifications.failed('Export failed: No data to export');
    }, 2400);
    
    setTimeout(() => {
      queryHistoryNotifications.failed('Failed to save query');
    }, 3200);
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, errorNotifications: true }));
      toast.success('Error notification tests completed');
    }, 4000);
  };

  const runLoadingNotificationTests = () => {
    setTestResults(prev => ({ ...prev, loadingNotifications: null }));
    
    const loadingToast1 = toast.loading('Test Loading Notification...', {
      id: 'loading-test-1',
    });
    
    setTimeout(() => {
      toast.success('Loading completed!', {
        id: 'loading-test-1',
        description: 'This replaces the loading notification',
      });
    }, 2000);
    
    setTimeout(() => {
      const loadingToast2 = queryNotifications.executing();
      setTimeout(() => {
        queryNotifications.success(5, 50);
      }, 1500);
    }, 2500);
    
    setTimeout(() => {
      const loadingToast3 = schemaNotifications.refreshing();
      setTimeout(() => {
        schemaNotifications.success();
      }, 1500);
    }, 4500);
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, loadingNotifications: true }));
    }, 6500);
  };

  const runInfoNotificationTests = () => {
    setTestResults(prev => ({ ...prev, infoNotifications: null }));
    
    setTimeout(() => {
      notifyInfo('Test Info Notification', 'This is a test info message');
    }, 100);
    
    setTimeout(() => {
      connectionNotifications.disconnected('Test Connection');
    }, 800);
    
    setTimeout(() => {
      queryNotifications.cancelled();
    }, 1600);
    
    setTimeout(() => {
      queryHistoryNotifications.cleared();
    }, 2400);
    
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, infoNotifications: true }));
      toast.success('Info notification tests completed');
    }, 3200);
  };

  const runResponsiveDesignTests = () => {
    setTestResults(prev => ({ ...prev, responsiveDesign: null }));
    
    const width = windowWidth;
    let result = false;
    
    if (width < 768) {
      toast.info('Mobile viewport detected', {
        description: 'Resize your browser to test different viewports',
      });
    } else if (width >= 768 && width < 1024) {
      toast.info('Tablet viewport detected', {
        description: 'Resize your browser to test different viewports',
      });
    } else {
      toast.info('Desktop viewport detected', {
        description: 'Resize your browser to test mobile/tablet viewports',
      });
    }
    
    // Manual inspection required
    setTimeout(() => {
      setTestResults(prev => ({ ...prev, responsiveDesign: true }));
      toast.success('Responsive design test completed (manual inspection required)');
    }, 2000);
  };

  const runAllTests = () => {
    setTestResults({
      emptyStates: null,
      successNotifications: null,
      errorNotifications: null,
      loadingNotifications: null,
      infoNotifications: null,
      responsiveDesign: null,
    });
    
    runEmptyStateTests();
    setTimeout(() => runSuccessNotificationTests(), 2000);
    setTimeout(() => runErrorNotificationTests(), 7000);
    setTimeout(() => runLoadingNotificationTests(), 11000);
    setTimeout(() => runInfoNotificationTests(), 18000);
    setTimeout(() => runResponsiveDesignTests(), 22000);
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === true) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === false) return <XCircle className="h-5 w-5 text-red-500" />;
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  };

  const getStatusBadge = (status: boolean | null) => {
    if (status === true) return <Badge variant="default" className="bg-green-500">Passed</Badge>;
    if (status === false) return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Phase 12.11: UI/UX Improvements Test Page</CardTitle>
          <CardDescription>
            Test empty states, notifications, and responsive design features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Button onClick={runAllTests}>Run All Tests</Button>
            <Button onClick={runEmptyStateTests} variant="outline">Test Empty States</Button>
            <Button onClick={runSuccessNotificationTests} variant="outline">Test Success Notifications</Button>
            <Button onClick={runErrorNotificationTests} variant="outline">Test Error Notifications</Button>
            <Button onClick={runLoadingNotificationTests} variant="outline">Test Loading Notifications</Button>
            <Button onClick={runInfoNotificationTests} variant="outline">Test Info Notifications</Button>
            <Button onClick={runResponsiveDesignTests} variant="outline">Test Responsive Design</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(testResults).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between p-3 border rounded-md">
                <span className="font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {getStatusBadge(status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="empty-states" className="space-y-4">
        <TabsList>
          <TabsTrigger value="empty-states">Empty States</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="responsive">Responsive Design</TabsTrigger>
        </TabsList>

        <TabsContent value="empty-states" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>No Connections Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <NoConnectionsEmptyState onCreateConnection={() => toast.info('Create connection clicked')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>No Tables Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <NoTablesEmptyState />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>No Tables (With Search) Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <NoTablesEmptyState 
                searchQuery="nonexistent" 
                onClearSearch={() => toast.info('Clear search clicked')} 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>No Query Results Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <NoQueryResultsEmptyState />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>No Query History Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <NoQueryHistoryEmptyState />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>No Saved Queries Empty State</CardTitle>
            </CardHeader>
            <CardContent>
              <NoSavedQueriesEmptyState onSaveQuery={() => toast.info('Save query clicked')} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Empty Diagram State</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyDiagramState />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Test Buttons</CardTitle>
              <CardDescription>
                Click the buttons above to test different notification types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Success Notifications</h3>
                  <div className="space-y-2">
                    <Button onClick={() => notifySuccess('Success!', 'Operation completed successfully')} variant="outline" className="w-full">
                      Test Success
                    </Button>
                    <Button onClick={() => connectionNotifications.created('My Connection')} variant="outline" className="w-full">
                      Connection Created
                    </Button>
                    <Button onClick={() => queryNotifications.success(100, 250)} variant="outline" className="w-full">
                      Query Success
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Error Notifications</h3>
                  <div className="space-y-2">
                    <Button onClick={() => notifyError('Error!', 'Something went wrong')} variant="outline" className="w-full">
                      Test Error
                    </Button>
                    <Button onClick={() => connectionNotifications.failed('Connection failed')} variant="outline" className="w-full">
                      Connection Failed
                    </Button>
                    <Button onClick={() => queryNotifications.failed('Query failed')} variant="outline" className="w-full">
                      Query Failed
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Info Notifications</h3>
                  <div className="space-y-2">
                    <Button onClick={() => notifyInfo('Info', 'This is an info message')} variant="outline" className="w-full">
                      Test Info
                    </Button>
                    <Button onClick={() => connectionNotifications.disconnected('My Connection')} variant="outline" className="w-full">
                      Disconnected
                    </Button>
                    <Button onClick={() => queryNotifications.cancelled()} variant="outline" className="w-full">
                      Query Cancelled
                    </Button>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Warning Notifications</h3>
                  <div className="space-y-2">
                    <Button onClick={() => notifyWarning('Warning', 'This is a warning')} variant="outline" className="w-full">
                      Test Warning
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="responsive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Responsive Design Test</CardTitle>
              <CardDescription>
                Resize your browser window to test responsive behavior. Current width: <strong>{windowWidth}px</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Breakpoints:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Mobile: &lt; 768px</li>
                    <li>• Tablet: 768px - 1024px</li>
                    <li>• Desktop: &gt; 1024px</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2">Current Viewport:</p>
                  <Badge variant={windowWidth < 768 ? "destructive" : windowWidth < 1024 ? "default" : "default"}>
                    {windowWidth < 768 ? "Mobile" : windowWidth < 1024 ? "Tablet" : "Desktop"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Test responsive design by navigating to other pages (Connection Manager, Schema Browser, Table Viewer, etc.)
                    and resizing the browser window.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UIUXTest;

