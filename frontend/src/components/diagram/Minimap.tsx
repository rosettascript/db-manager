import { Card } from "@/components/ui/card";

interface MinimapProps {
  tables: Array<{ id: string; position: { x: number; y: number } }>;
  viewportWidth: number;
  viewportHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  onNavigate: (x: number, y: number) => void;
}

export const Minimap = ({
  tables,
  viewportWidth,
  viewportHeight,
  canvasWidth,
  canvasHeight,
  onNavigate,
}: MinimapProps) => {
  const minimapWidth = 200;
  const minimapHeight = 150;
  const scaleX = minimapWidth / canvasWidth;
  const scaleY = minimapHeight / canvasHeight;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;
    onNavigate(x, y);
  };

  return (
    <Card
      className="absolute bottom-6 right-6 p-2 shadow-lg cursor-pointer z-10 bg-card/95 backdrop-blur"
      style={{ width: minimapWidth + 16, height: minimapHeight + 16 }}
      onClick={handleClick}
    >
      <div
        className="relative bg-muted/30 rounded"
        style={{ width: minimapWidth, height: minimapHeight }}
      >
        {/* Table indicators */}
        {tables.map((table) => (
          <div
            key={table.id}
            className="absolute bg-primary rounded-sm"
            style={{
              left: `${table.position.x * scaleX}px`,
              top: `${table.position.y * scaleY}px`,
              width: `${80 * scaleX}px`,
              height: `${40 * scaleY}px`,
            }}
          />
        ))}
        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-accent rounded pointer-events-none"
          style={{
            width: `${viewportWidth * scaleX}px`,
            height: `${viewportHeight * scaleY}px`,
          }}
        />
      </div>
    </Card>
  );
};
