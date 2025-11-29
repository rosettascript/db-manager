import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { KeyboardShortcut, formatShortcut } from "@/lib/keyboardShortcuts";

interface ShortcutTooltipProps {
  children: ReactNode;
  shortcut: KeyboardShortcut | string;
  description?: ReactNode; // Optional additional content/description for the tooltip
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

/**
 * Tooltip component that displays a description with keyboard shortcut badge
 * Works with nested asChild patterns by cloning children properly
 */
export function ShortcutTooltip({
  children,
  shortcut,
  description,
  side = "bottom",
  align = "center",
}: ShortcutTooltipProps) {
  // Normalize shortcut to KeyboardShortcut format if it's a string
  const shortcutObj: KeyboardShortcut = typeof shortcut === 'string' 
    ? { id: 'custom', key: shortcut, modifiers: {} }
    : shortcut;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} className="flex items-center gap-2">
          {description && <span className="mr-1">{description}</span>}
          <span className="text-xs text-muted-foreground font-mono">
            {formatShortcut(shortcutObj)}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

