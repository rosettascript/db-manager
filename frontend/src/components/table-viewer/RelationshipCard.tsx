import { ExternalLink, ArrowRight, Filter, ExternalLinkIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ForeignKey } from "@/lib/mockData";

interface RelationshipCardProps {
  foreignKey: ForeignKey;
  currentTable: string;
  isIncoming?: boolean;
  referencingTable?: string;
  relatedRowCount?: number;
}

export const RelationshipCard = ({
  foreignKey,
  currentTable,
  isIncoming = false,
  referencingTable,
  relatedRowCount,
}: RelationshipCardProps) => {
  const navigate = useNavigate();
  const targetTable = isIncoming ? referencingTable : foreignKey.referencedTable;

  const handleNavigate = () => {
    if (targetTable) {
      navigate(`/table/${targetTable}`);
    }
  };

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetTable) {
      window.open(`/table/${targetTable}`, '_blank');
    }
  };

  return (
    <Card 
      className="cursor-pointer transition-all hover:border-primary hover:shadow-md group"
      onClick={handleNavigate}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-sm font-mono flex items-center gap-2">
              {foreignKey.name}
              <Badge variant={isIncoming ? "secondary" : "outline"} className="text-xs">
                {isIncoming ? "Incoming" : "Outgoing"}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              {isIncoming ? (
                <>
                  <span className="font-mono text-primary">{referencingTable}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-mono">{currentTable}</span>
                </>
              ) : (
                <>
                  <span className="font-mono">{foreignKey.columns.join(", ")}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-mono text-primary">
                    {foreignKey.referencedTable}.{foreignKey.referencedColumns.join(", ")}
                  </span>
                </>
              )}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleOpenNewTab}
          >
            <ExternalLinkIcon className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      {relatedRowCount !== undefined && relatedRowCount > 0 && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="bg-muted">
              {relatedRowCount.toLocaleString()} rows in table
            </Badge>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
