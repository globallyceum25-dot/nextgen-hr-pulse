import { useState } from "react";
import AppSidebar from "./AppSidebar";

interface AppLayoutProps {
  children: (props: { selectedSector: number | null }) => React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [selectedSector, setSelectedSector] = useState<number | null>(null);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar selectedSector={selectedSector} onSectorChange={setSelectedSector} />
      <main className="flex-1 overflow-auto">
        {children({ selectedSector })}
      </main>
    </div>
  );
}
