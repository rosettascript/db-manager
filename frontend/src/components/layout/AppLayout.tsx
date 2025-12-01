import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette, CommandPaletteProvider } from "@/components/keyboard";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <CommandPaletteProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <CommandPalette />
        </div>
      </SidebarProvider>
    </CommandPaletteProvider>
  );
}

