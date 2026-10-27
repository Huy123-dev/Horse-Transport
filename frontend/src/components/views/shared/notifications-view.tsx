"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck } from "lucide-react";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATIONS_CHANGED_EVENT,
  notifyNotificationsChanged,
  notificationDestination,
  notificationDate,
  type NotificationItem,
} from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";

export function NotificationsView() {
  const { user, navigate } = useAppStore();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const notifications = await getNotifications();
      setItems(notifications);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const onNotificationsChanged = () => { void load(); };
    getNotifications()
      .then((notifications) => {
        if (active) {
          setItems(notifications);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải thông báo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onNotificationsChanged);
    };
  }, [load]);

  const markRead = async (item: NotificationItem) => {
    try {
      await markNotificationRead(item.notificationId);
      setItems((current) => current.map((notification) =>
        notification.notificationId === item.notificationId ? { ...notification, read: true } : notification
      ));
      notifyNotificationsChanged();
    } catch (actionError) {
      toast({
        title: "Không thể cập nhật thông báo",
        description: actionError instanceof Error ? actionError.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      notifyNotificationsChanged();
    } catch (actionError) {
      toast({
        title: "Không thể cập nhật thông báo",
        description: actionError instanceof Error ? actionError.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const openRelatedEntity = async (item: NotificationItem) => {
    if (!user) return;
    const destination = notificationDestination(item, user.roleId);
    if (!destination) return;
    try {
      if (!item.read) {
        await markNotificationRead(item.notificationId);
        setItems((current) => current.map((notification) =>
          notification.notificationId === item.notificationId ? { ...notification, read: true } : notification
        ));
        notifyNotificationsChanged();
      }
      navigate(destination.view, destination.params);
    } catch (actionError) {
      toast({
        title: "Không thể mở nội dung thông báo",
        description: actionError instanceof Error ? actionError.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thông báo"
        description="Tất cả thông báo và cảnh báo dành cho tài khoản của bạn"
        icon={<Bell className="h-5 w-5" />}
        actions={unreadCount > 0 ? (
          <Button variant="outline" onClick={() => void markAllRead()} className="gap-2">
            <CheckCheck className="h-4 w-4" /> Đánh dấu tất cả đã đọc
          </Button>
        ) : undefined}
      />
      {loading ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Đang tải thông báo…</CardContent></Card>
      ) : error ? (
        <Card><CardContent className="space-y-3 p-6">
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => void load()}>Thử tải lại</Button>
        </CardContent></Card>
      ) : items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Bell className="h-8 w-8 opacity-40" />
          <p className="text-sm">Bạn chưa có thông báo.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.notificationId} className={item.read ? "" : "border-primary/30 bg-primary/[0.03]"}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${item.read ? "bg-muted-foreground/30" : "bg-primary"}`} />
                  <div className="min-w-0">
                    <p className="font-semibold">{item.title}</p>
                    {item.message && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">{notificationDate(item.createdAt)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {notificationDestination(item, user?.roleId ?? "") && (
                    <Button variant="link" size="sm" onClick={() => void openRelatedEntity(item)} className="h-auto px-1">
                      Mở nội dung
                    </Button>
                  )}
                  {!item.read && (
                    <Button variant="ghost" size="sm" onClick={() => void markRead(item)}>
                      Đánh dấu đã đọc
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
