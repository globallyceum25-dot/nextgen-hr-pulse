import { useState, useEffect } from "react";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { friendlyError } from "@/lib/errorMessage";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  task_id: string | null;
  created_at: string;
}

function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    refetchInterval: 30000,
    // Don't keep polling a tab the user isn't looking at.
    refetchIntervalInBackground: false,
  });
}

// Both mutations used to drop the `{ error }` from the update. Supabase resolves
// rather than throwing on a failed write, so an RLS denial looked like success:
// onSuccess fired, the refetch returned the still-unread row, and the badge
// count snapped back — up to 30s later, so it read as the app randomly
// un-reading notifications, with no error ever shown.
function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (err) => toast({
      title: "Could not mark as read",
      description: friendlyError(err),
      variant: "destructive",
    }),
  });
}

function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired — please sign in again.");
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (err) => toast({
      title: "Could not mark all as read",
      description: friendlyError(err),
      variant: "destructive",
    }),
  });
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const typeColors: Record<string, string> = {
  overdue: "bg-red-500",
  due_soon: "bg-orange-500",
  assigned: "bg-blue-500",
  completed: "bg-emerald-500",
  status_update: "bg-purple-500",
  comment: "bg-amber-500",
  info: "bg-slate-400",
};

export default function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllRead.mutate()}>
              <Check size={12} className="mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors ${!n.is_read ? "bg-primary/5" : ""}`}
                  onClick={() => !n.is_read && markRead.mutate(n.id)}
                >
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${typeColors[n.type] || typeColors.info}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-muted-foreground/60 mt-1 block">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
