import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  ClipboardList,
  HelpCircle,
  LogOut,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface UserInfo {
  email: string;
  fullName: string;
  initials: string;
  avatarUrl: string | null;
}

export default function UserAccountDropdown() {
  const [user, setUser] = useState<UserInfo>({ email: "", fullName: "", initials: "?", avatarUrl: null });
  const { role, can } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const email = authUser.email || "";
      let fullName = authUser.user_metadata?.full_name || "";
      let avatarUrl: string | null = null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (profile?.full_name) fullName = profile.full_name;
      if (profile?.avatar_url) avatarUrl = profile.avatar_url;

      const initials = fullName
        ? fullName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
        : email.slice(0, 2).toUpperCase();

      setUser({ email, fullName: fullName || email.split("@")[0], initials, avatarUrl });
    }
    load();
  }, []);

  const roleLabelMap: Record<string, string> = {
    super_admin: "Super Admin",
    sector_hr_admin: "Sector HR Admin",
    responsible_person: "Responsible Person",
    viewer: "Viewer",
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Avatar className="h-8 w-8 border border-primary/30">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
            <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-xs font-medium text-foreground leading-tight">{user.fullName}</span>
            <span className="text-[10px] text-muted-foreground leading-tight">{roleLabelMap[role] || role}</span>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 card-gradient border-white/10 backdrop-blur-xl shadow-2xl"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-primary/30">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-sm font-bold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{user.fullName}</span>
              <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
              <span className="text-[10px] text-primary/80 font-medium mt-0.5">{roleLabelMap[role] || role}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuGroup>
          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5"
            onClick={() => navigate("/profile")}
          >
            <User size={15} className="text-muted-foreground" />
            <span>My Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5"
            onClick={() => navigate("/tasks?myTasks=true")}
          >
            <ClipboardList size={15} className="text-muted-foreground" />
            <span>My Tasks</span>
          </DropdownMenuItem>

          {can("admin") && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5"
              onClick={() => navigate("/admin")}
            >
              <Shield size={15} className="text-muted-foreground" />
              <span>Administration</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            className="gap-2 cursor-pointer hover:bg-white/5 focus:bg-white/5"
            disabled
          >
            <HelpCircle size={15} className="text-muted-foreground" />
            <span>Help & Support</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          className="gap-2 cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive"
          onClick={handleLogout}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
