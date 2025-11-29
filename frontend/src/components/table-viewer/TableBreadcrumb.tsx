import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface BreadcrumbItem {
  id: string;
  name: string;
  schema: string;
}

interface TableBreadcrumbProps {
  trail: BreadcrumbItem[];
  onNavigate: (tableId: string) => void;
}

export const TableBreadcrumb = ({ trail, onNavigate }: TableBreadcrumbProps) => {
  if (trail.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
      <Link to="/">
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
          <Home className="w-3 h-3" />
          Schema
        </Button>
      </Link>
      {trail.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          {index === trail.length - 1 ? (
            <span className="font-medium text-foreground px-2">
              {item.schema}.{item.name}
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 hover:text-foreground"
              onClick={() => onNavigate(item.id)}
            >
              {item.schema}.{item.name}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
