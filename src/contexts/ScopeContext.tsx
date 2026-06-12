import { createContext, useContext, useState, ReactNode } from "react";

interface ScopeCtx {
  companyId: string | null;
  departmentId: string | null;
  setCompanyId: (v: string | null) => void;
  setDepartmentId: (v: string | null) => void;
}

const Ctx = createContext<ScopeCtx | undefined>(undefined);

export function ScopeProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const setCompanyId = (v: string | null) => {
    setCompanyIdState(v);
    setDepartmentId(null); // reset dependent
  };

  return (
    <Ctx.Provider value={{ companyId, departmentId, setCompanyId, setDepartmentId }}>
      {children}
    </Ctx.Provider>
  );
}

export function useScope() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useScope must be used inside ScopeProvider");
  return ctx;
}
