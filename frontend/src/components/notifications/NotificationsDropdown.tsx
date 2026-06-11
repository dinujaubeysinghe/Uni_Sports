import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, CheckCheck, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app";

type ApiNotificationType =
  | "session_time_change"
  | "join_request_accepted"
  | "join_request_rejected"
  | "session_cancelled"
  | "new_session_available"
  | "coach_assigned_to_sport"
  | "location_booking_approved"
  | "location_booking_declined"
  | "location_booking_clash"
  | "location_booking_request_submitted"
  | "admin_location_booking_request"
  | "other";

interface ApiNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const typeConfig: Record<ApiNotificationType, { icon: typeof Info; className: string }> = {
  session_time_change: { icon: AlertTriangle, className: "text-warning bg-warning/10" },
  join_request_accepted: { icon: CheckCircle2, className: "text-success bg-success/10" },
  join_request_rejected: { icon: XCircle, className: "text-destructive bg-destructive/10" },
  session_cancelled: { icon: XCircle, className: "text-destructive bg-destructive/10" },
  new_session_available: { icon: Info, className: "text-info bg-info/10" },
  coach_assigned_to_sport: { icon: CheckCircle2, className: "text-success bg-success/10" },
  location_booking_approved: { icon: CheckCircle2, className: "text-success bg-success/10" },
  location_booking_declined: { icon: XCircle, className: "text-destructive bg-destructive/10" },
  location_booking_clash: { icon: AlertTriangle, className: "text-warning bg-warning/10" },
  location_booking_request_submitted: { icon: Info, className: "text-info bg-info/10" },
  admin_location_booking_request: { icon: AlertTriangle, className: "text-warning bg-warning/10" },
  other: { icon: Info, className: "text-info bg-info/10" },
};

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [open, setOpen] = useState(false);

  const token = localStorage.getItem("token");

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/notifications?limit=20`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.data ?? []);
    } catch (error) {
      console.error("Failed to load notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications],
  );

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === id ? { ...notification, isRead: true } : notification,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white rounded-lg shadow-lg" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="font-display font-bold text-sm text-black">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-gray-600 hover:text-black" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No notifications</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notif) => {
                const config = typeConfig[notif.type as ApiNotificationType] ?? typeConfig.other;
                const Icon = config.icon;
                return (
                  <button
                    key={notif._id}
                    onClick={() => markAsRead(notif._id)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-100 transition-colors",
                      !notif.isRead && "bg-blue-50"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.className)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-medium text-black", !notif.isRead && "font-semibold")}>{notif.title}</p>
                        {!notif.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
