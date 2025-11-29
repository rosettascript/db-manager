import { cn } from "@/lib/utils";

interface ShortcutBadgeProps {
  shortcut: string;
  className?: string;
}

/**
 * Component to display keyboard shortcuts as badges
 * Formats shortcuts like "Ctrl+K" for display
 */
export function ShortcutBadge({ shortcut, className }: ShortcutBadgeProps) {
  return (
    <span
      className={cn(
        "ml-auto inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground",
        className
      )}
    >
      {shortcut.split("+").map((key, index, array) => (
        <span key={index}>
          <kbd className="rounded bg-background px-1 py-0.5 font-mono text-xs font-semibold shadow-sm">
            {key.trim()}
          </kbd>
          {index < array.length - 1 && <span className="text-muted-foreground">+</span>}
        </span>
      ))}
    </span>
  );
}





