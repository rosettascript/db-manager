import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

export function PageHeader({ title, description, actions, icon, badge }: PageHeaderProps) {
  return (
    <div className="border-b-2 border-border bg-black sticky top-0 z-10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 animate-fade-in">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-black">
                {icon}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-mono font-bold tracking-wider uppercase text-primary text-glow">
                  [/{title.toUpperCase()}]
                </h1>
                {badge}
              </div>
              {description && (
                <p className="mt-1 text-xs font-mono text-muted-foreground">// {description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

