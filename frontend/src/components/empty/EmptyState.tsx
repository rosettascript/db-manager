import React from 'react';
import { LucideIcon, Database, Table2, Search, FileQuestion, History, BookMarked, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Reusable Empty State Component
 * Provides consistent empty states throughout the application
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) => {
  return (
    <div className={cn('flex items-center justify-center py-12 px-4', className)}>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-4">
              <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
          <CardTitle>{title}</CardTitle>
          {description && (
            <CardDescription className="mt-2">{description}</CardDescription>
          )}
        </CardHeader>
        {(action || secondaryAction) && (
          <CardContent className="space-y-2">
            {action && (
              <Button onClick={action.onClick} className="w-full">
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button variant="outline" onClick={secondaryAction.onClick} className="w-full">
                {secondaryAction.label}
              </Button>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

/**
 * Empty State for No Connections
 */
export const NoConnectionsEmptyState = ({
  onCreateConnection,
}: {
  onCreateConnection: () => void;
}) => {
  return (
    <EmptyState
      icon={Database}
      title="No Database Connections"
      description="Get started by creating your first database connection. You can connect to PostgreSQL databases to explore schemas, tables, and data."
      action={{
        label: 'Create Connection',
        onClick: onCreateConnection,
      }}
    />
  );
};

/**
 * Empty State for No Tables
 */
export const NoTablesEmptyState = ({
  searchQuery,
  onClearSearch,
}: {
  searchQuery?: string;
  onClearSearch?: () => void;
}) => {
  if (searchQuery) {
    return (
      <EmptyState
        icon={Search}
        title="No Tables Found"
        description={`No tables match your search "${searchQuery}". Try adjusting your search terms.`}
        action={
          onClearSearch
            ? {
                label: 'Clear Search',
                onClick: onClearSearch,
              }
            : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      icon={Table2}
      title="No Tables Available"
      description="This database doesn't have any tables yet, or the current schema is empty. Check if you're connected to the correct database."
    />
  );
};

/**
 * Empty State for No Query Results
 */
export const NoQueryResultsEmptyState = () => {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No Query Results"
      description="Your query executed successfully but returned no rows. Try adjusting your query or filters."
    />
  );
};

/**
 * Empty State for No Query History
 */
export const NoQueryHistoryEmptyState = () => {
  return (
    <EmptyState
      icon={History}
      title="No Query History"
      description="Your executed queries will appear here. Start by running a query to see it in your history."
    />
  );
};

/**
 * Empty State for No Saved Queries
 */
export const NoSavedQueriesEmptyState = ({
  onSaveQuery,
}: {
  onSaveQuery?: () => void;
}) => {
  return (
    <EmptyState
      icon={BookMarked}
      title="No Saved Queries"
      description="Save frequently used queries for quick access. Your saved queries will appear here."
      action={
        onSaveQuery
          ? {
              label: 'Save a Query',
              onClick: onSaveQuery,
            }
          : undefined
      }
    />
  );
};

/**
 * Empty State for Empty Diagram
 */
export const EmptyDiagramState = () => {
  return (
    <EmptyState
      icon={Network}
      title="No Tables in Diagram"
      description="Select schemas to visualize or check if your database has tables in the selected schemas."
    />
  );
};

