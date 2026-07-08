import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SECTORS, LYCEUM_CAMPUSES, LEDU_SUB_UNIT_ENTITIES } from "@/data/mockData";
import {
  LayoutDashboard, ListTodo, BarChart3, Users, Building2,
  ChevronLeft, ChevronRight, ChevronDown, Settings, LogOut, FileText, Shield,
  GraduationCap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions, RbacModuleKey } from "@/hooks/usePermissions";
import { Module } from "@/config/rbac";

interface AppSidebarProps {
  selectedSector: number | null;
  onSectorChange: (id: number | null) => void;
}

const allNavItems: { label: string; icon: typeof LayoutDashboard; path: string; module: Module }[] = [
  { label: "Tasks", icon: ListTodo, path: "/tasks", module: "tasks" },
  { label: "Task Analysis", icon: BarChart3, path: "/", module: "analytics" },
  { label: "Master Sheets", icon: Users, path: "/employees", module: "employees" },
  { label: "Reports", icon: FileText, path: "/reports", module: "reports" },
  { label: "Administration", icon: Settings, path: "/admin", module: "admin" },
  { label: "Access Control", icon: Shield, path: "/admin/rbac", module: "admin" },
];

export default function AppSidebar({ selectedSector, onSectorChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sectorsOpen, setSectorsOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const location = useLocation();
  const { role, can, loading } = useUserRole();
  const { can: rbacCan, isSuperAdmin } = usePermissions();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  const navItems = allNavItems.filter(item =>
    isSuperAdmin || can(item.module) || rbacCan(item.module as RbacModuleKey, "view")
  );

  const roleBadge: Record<string, string> = {
    super_admin: "Super Admin",
    sector_hr_admin: "HR Admin",
    responsible_person: "Responsible",
    viewer: "Viewer",
  };

  return (
    <aside
      className={cn(
        "h-screen gradient-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-snappy sticky top-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">Nextgen HCS</h1>
            <p className="text-[10px] text-sidebar-foreground/50">HR Task & KPI System</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-accent transition-snappy text-sidebar-foreground/70"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        <div className="px-2 space-y-0.5">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-snappy",
                location.pathname === item.path
                  ? "gradient-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon size={18} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </div>

        {/* Sectors */}
        {!collapsed && (
          <div className="mt-6 px-2">
            <button
              onClick={() => setSectorsOpen(!sectorsOpen)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40"
            >
              Sectors
              <ChevronDown
                size={14}
                className={cn("transition-snappy", sectorsOpen ? "rotate-0" : "-rotate-90")}
              />
            </button>
            {sectorsOpen && (
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => onSectorChange(null)}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs transition-snappy",
                    selectedSector === null
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
                  )}
                >
                  <Building2 size={14} />
                  All Sectors
                </button>
                {SECTORS.map(s => {
                  const isSelected = selectedSector === s.id;
                  const isLedu = s.type === "LEDU";
                  return (
                    <div key={s.id}>
                      <button
                        onClick={() => onSectorChange(s.id)}
                        className={cn(
                          "flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs transition-snappy truncate",
                          isSelected
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
                        )}
                        title={s.name}
                      >
                        {isLedu ? (
                          <GraduationCap size={14} className="flex-shrink-0 text-primary" />
                        ) : (
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            isSelected ? "bg-sidebar-primary" : "bg-sidebar-foreground/20"
                          )} />
                        )}
                        <span className="truncate flex-1 text-left">{s.name}</span>
                        {isLedu && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary tracking-wider">EDU</span>
                        )}
                      </button>

                      {/* LEDU sub-units */}
                      {isLedu && isSelected && s.subUnits && (
                        <LeduSubtree subUnits={s.subUnits} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

    </aside>
  );
}

function LeduSubtree({ subUnits }: { subUnits: string[] }) {
  const [selectedSubUnit, setSelectedSubUnit] = useState<string | null>(null);
  return (
    <div className="ml-4 mt-1 space-y-0.5 border-l border-sidebar-border/40 pl-2">
      {subUnits.map(su => {
        const active = selectedSubUnit === su;
        return (
          <div key={su}>
            <button
              onClick={() => setSelectedSubUnit(active ? null : su)}
              className={cn(
                "flex items-center gap-2 w-full px-2 py-1 rounded text-[11px] transition-snappy",
                active
                  ? "bg-sidebar-accent/60 text-sidebar-foreground"
                  : "text-sidebar-foreground/50 hover:bg-sidebar-accent/40"
              )}
            >
              <ChevronDown size={11} className={cn("transition-snappy", active ? "rotate-0" : "-rotate-90")} />
              <span className="truncate">{su}</span>
            </button>
            {active && su === "Lyceum Schools" && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border/30 pl-2">
                {LYCEUM_CAMPUSES.map(c => (
                  <button
                    key={c}
                    className="block w-full text-left px-2 py-0.5 rounded text-[10.5px] text-sidebar-foreground/45 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground/80 truncate"
                    title={c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
