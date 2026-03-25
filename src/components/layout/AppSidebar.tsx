import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { SECTORS } from "@/data/mockData";
import {
  LayoutDashboard, ListTodo, BarChart3, Users, Building2,
  ChevronLeft, ChevronRight, ChevronDown, Settings, LogOut,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface AppSidebarProps {
  selectedSector: number | null;
  onSectorChange: (id: number | null) => void;
}

export default function AppSidebar({ selectedSector, onSectorChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [sectorsOpen, setSectorsOpen] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/" },
    { label: "Tasks", icon: ListTodo, path: "/tasks" },
    { label: "Task Analysis", icon: BarChart3, path: "/analytics" },
    { label: "Employees", icon: Users, path: "/employees" },
    { label: "Administration", icon: Settings, path: "/admin" },
  ];

  return (
    <aside
      className={cn(
        "h-screen bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-snappy sticky top-0",
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
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
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
                {SECTORS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => onSectorChange(s.id)}
                    className={cn(
                      "flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs transition-snappy truncate",
                      selectedSector === s.id
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      selectedSector === s.id ? "bg-sidebar-primary" : "bg-sidebar-foreground/20"
                    )} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary flex items-center justify-center text-[11px] font-semibold text-sidebar-primary-foreground">
              SA
            </div>
            <div>
              <p className="text-xs font-medium text-sidebar-foreground">Super Admin</p>
              <p className="text-[10px] text-sidebar-foreground/50">All sectors</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
