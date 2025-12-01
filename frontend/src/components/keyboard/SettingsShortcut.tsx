import { useSettings } from "@/contexts/SettingsContext";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";

export function SettingsShortcut() {
  const { open } = useSettings();

  // Open settings with Ctrl+,
  useKeyboardShortcut(
    ',',
    () => open(),
    { ctrl: true }
  );

  return null; // This component doesn't render anything
}















