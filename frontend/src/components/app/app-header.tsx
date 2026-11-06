"use client";

import { useAppStore } from "@/store/app-store";
import { ROLE_LABELS } from "@/lib/constants";
import { RoleBadge, getRoleConfig } from "@/components/app/role-badge";
import { Bell, CheckCheck, LogOut, Menu } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
  notifyNotificationsChanged,
  notificationDestination,
  notificationDate,
  type NotificationItem,
} from "@/lib/notifications";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlobalSearch } from "./global-search";
import { HelpCircle } from "lucide-react";

export function AppHeader() {
  const { user, setUser, navigate } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificationState, setNotificationState] = useState<{
    userId: string;
    notifications: NotificationItem[];
    unreadCount: number;
    error: string;
  } | null>(null);
  const { toast } = useToast();
  const userId = user?.userId;

  const currentNotificationState = notificationState?.userId === userId ? notificationState : null;
  const notifications = currentNotificationState?.notifications ?? [];
  const unreadCount = currentNotificationState?.unreadCount ?? 0;
  const notificationError = currentNotificationState?.error ?? "";
  const notificationsLoading = Boolean(userId && currentNotificationState === null);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const [items, count] = await Promise.all([getNotifications(), getUnreadNotificationCount()]);
      if (useAppStore.getState().user?.userId !== userId) return;
      setNotificationState({ userId, notifications: items, unreadCount: count, error: "" });
    } catch (error) {
      if (useAppStore.getState().user?.userId !== userId) return;
      setNotificationState({
        userId,
        notifications: [],
        unreadCount: 0,
        error: error instanceof Error ? error.message : "Không thể tải thông báo.",
      });
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const onNotificationsChanged = () => { void loadNotifications(); };
    void Promise.all([getNotifications(), getUnreadNotificationCount()])
      .then(([items, count]) => {
        if (active) setNotificationState({ userId, notifications: items, unreadCount: count, error: "" });
      })
      .catch((error: unknown) => {
        if (active) setNotificationState({
          userId,
          notifications: [],
          unreadCount: 0,
          error: error instanceof Error ? error.message : "Không thể tải thông báo.",
        });
      });
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadNotifications);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    };
  }, [loadNotifications, userId]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setUser(null);
    toast({ title: "Đã đăng xuất", description: "Hẹn gặp lại." });
  };

  if (!user) return null;
  const initials = user.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const roleConfig = getRoleConfig(user.roleId, user.staffType);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotificationState((current) => {
        if (!current || !userId || current.userId !== userId) return current;
        return {
          ...current,
          notifications: current.notifications.map((item) => ({ ...item, read: true })),
          unreadCount: 0,
        };
      });
      notifyNotificationsChanged();
    } catch (error) {
      toast({
        title: "Không thể cập nhật thông báo",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      if (!notification.read) {
        await markNotificationRead(notification.notificationId);
        setNotificationState((current) => {
          if (!current || !userId || current.userId !== userId) return current;
          return {
            ...current,
            notifications: current.notifications.map((item) =>
              item.notificationId === notification.notificationId ? { ...item, read: true } : item
            ),
            unreadCount: Math.max(0, current.unreadCount - 1),
          };
        });
        notifyNotificationsChanged();
      }
      setNotifOpen(false);
      const destination = notificationDestination(notification, user?.roleId ?? "");
      navigate(destination?.view ?? "notifications", destination?.params);
    } catch (error) {
      toast({
        title: "Không thể cập nhật thông báo",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex flex-1 items-center gap-3">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          onClick={() => useAppStore.getState().setSidebarOpen(!useAppStore.getState().sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <p className="text-xs text-muted-foreground">Xin chào,</p>
          <p className="text-sm font-semibold leading-tight text-foreground">{user.name}</p>
        </div>
        <div className="ml-auto">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" })); }}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Phím tắt"
          title="Phím tắt (?)"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Notifications dropdown */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={() => { if (!notifOpen) void loadNotifications(); }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Thông báo"
              title={`${unreadCount} thông báo chưa đọc`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--champagne-gold)] px-1 text-[10px] font-bold text-[#171311] shadow-xs">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Thông báo</p>
                <p className="text-xs text-muted-foreground">{unreadCount} chưa đọc</p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu đã đọc
                </button>
              )}
            </div>
            {notificationsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Đang tải thông báo…</p>
            ) : notificationError ? (
              <div className="px-4 py-6 text-center text-sm text-destructive">
                {notificationError}
                <button type="button" onClick={() => void loadNotifications()} className="mt-2 block w-full text-primary underline">Thử lại</button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-40" />
                <p className="text-sm">Bạn chưa có thông báo.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {notifications.slice(0, 5).map((notification) => (
                  <button
                    key={notification.notificationId}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/70 ${notification.read ? "" : "bg-primary/5"}`}
                  >
                    <span className="flex items-start gap-2">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-primary"}`} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-foreground">{notification.title}</span>
                        {notification.message && <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>}
                        <span className="mt-1 block text-[10px] text-muted-foreground">{notificationDate(notification.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="border-t border-border p-2">
              <button onClick={() => { setNotifOpen(false); navigate("notifications"); }} className="w-full rounded-lg py-2 text-center text-sm font-medium text-primary hover:bg-primary/5">
                Xem tất cả thông báo
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown with Role Color */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted transition-colors">
              <Avatar
                className="h-8 w-8 border-2 transition-all"
                style={{ borderColor: roleConfig.color }}
              >
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{ backgroundColor: roleConfig.color + "25", color: roleConfig.color }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium leading-tight text-foreground">{user.name}</p>
                <p className="text-[10px] font-semibold leading-tight mt-0.5" style={{ color: roleConfig.color }}>
                  {roleConfig.label}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <RoleBadge roleId={user.roleId} staffType={user.staffType} size="sm" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-[var(--danger-fg)] focus:text-[var(--danger-fg)] cursor-pointer">
              <LogOut className="h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
