import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface FieldChange {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: Date;
  action: "created" | "updated" | "completed" | "subtask_updated" | "subtask_completed";
  taskName: string;
  taskId: string;
  description: string;
  changes?: FieldChange[];
}

interface ActivityLogContextType {
  entries: ActivityEntry[];
  addEntry: (entry: Omit<ActivityEntry, "id" | "timestamp">) => void;
}

const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  const addEntry = useCallback((entry: Omit<ActivityEntry, "id" | "timestamp">) => {
    setEntries(prev => [
      { ...entry, id: `log-${Date.now()}-${Math.random()}`, timestamp: new Date() },
      ...prev,
    ].slice(0, 50)); // keep last 50
  }, []);

  return (
    <ActivityLogContext.Provider value={{ entries, addEntry }}>
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLog() {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error("useActivityLog must be used within ActivityLogProvider");
  return ctx;
}
