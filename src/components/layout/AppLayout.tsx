import { useState } from "react";
import AppSidebar from "./AppSidebar";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserAccountDropdown from "@/components/layout/UserAccountDropdown";
import ThemeToggle from "@/components/layout/ThemeToggle";
import HeaderScopeSelector from "@/components/layout/HeaderScopeSelector";

interface AppLayoutProps {
  children: (props: { selectedSector: string | null }) => React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar selectedSector={selectedSector} onSectorChange={setSelectedSector} />
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-6 py-2 border-b gradient-header backdrop-blur">
          <HeaderScopeSelector />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <UserAccountDropdown />
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children({ selectedSector })}
        </main>
      </div>
    </div>
  );
}
