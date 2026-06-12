import { useEffect, useMemo } from "react";
import { Building2, Network } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanies } from "@/hooks/useCompanies";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { usePermissions } from "@/hooks/usePermissions";
import { useScope } from "@/contexts/ScopeContext";

export default function HeaderScopeSelector() {
  const { data: companies = [] } = useCompanies();
  const { data: departments = [] } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const { state, isSuperAdmin, ownEmployeeId } = usePermissions();
  const { companyId, departmentId, setCompanyId, setDepartmentId } = useScope();

  // Resolve which company/departments the current user is allowed to see (via RBAC scope).
  const linkedEmployee = useMemo(
    () => employees.find(e => e.id === ownEmployeeId) ?? null,
    [employees, ownEmployeeId]
  );

  const allowedCompanies = useMemo(() => {
    const active = companies.filter(c => c.status === "Active");
    if (isSuperAdmin || state?.scope?.all_companies || !state?.scope) {
      // Restrict to companies relevant to the linked employee if present.
      if (linkedEmployee) {
        return active.filter(c => c.company_name === linkedEmployee.company_name);
      }
      return active;
    }
    const ids = new Set(state.scope.company_ids);
    return active.filter(c => ids.has(c.id));
  }, [companies, state, isSuperAdmin, linkedEmployee]);

  const allowedDepartments = useMemo(() => {
    if (!companyId) return [];
    const active = departments.filter(
      d => d.status === "Active" && d.company_id === companyId
    );
    if (isSuperAdmin || state?.scope?.all_departments || !state?.scope) {
      return active;
    }
    const ids = new Set(state.scope.department_ids);
    return active.filter(d => ids.has(d.id));
  }, [departments, companyId, state, isSuperAdmin]);

  // Auto-pick: linked employee's company/department, else first allowed.
  useEffect(() => {
    if (companyId || allowedCompanies.length === 0) return;
    if (linkedEmployee) {
      const match = allowedCompanies.find(c => c.company_name === linkedEmployee.company_name);
      if (match) { setCompanyId(match.id); return; }
    }
    if (allowedCompanies.length === 1) setCompanyId(allowedCompanies[0].id);
  }, [allowedCompanies, companyId, linkedEmployee, setCompanyId]);

  useEffect(() => {
    if (departmentId || allowedDepartments.length === 0) return;
    if (linkedEmployee) {
      const match = allowedDepartments.find(d => d.department_name === linkedEmployee.department);
      if (match) { setDepartmentId(match.id); return; }
    }
    if (allowedDepartments.length === 1) setDepartmentId(allowedDepartments[0].id);
  }, [allowedDepartments, departmentId, linkedEmployee, setDepartmentId]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 min-w-[200px]">
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={companyId ?? ""}
          onValueChange={(v) => setCompanyId(v || null)}
          disabled={allowedCompanies.length === 0}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select Company" />
          </SelectTrigger>
          <SelectContent>
            {allowedCompanies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
            ))}
            {allowedCompanies.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No authorized companies</div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1.5 min-w-[200px]">
        <Network className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={departmentId ?? ""}
          onValueChange={(v) => setDepartmentId(v || null)}
          disabled={!companyId || allowedDepartments.length === 0}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={companyId ? "Select Department" : "Pick company first"} />
          </SelectTrigger>
          <SelectContent>
            {allowedDepartments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.department_name}</SelectItem>
            ))}
            {companyId && allowedDepartments.length === 0 && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">No authorized departments</div>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
