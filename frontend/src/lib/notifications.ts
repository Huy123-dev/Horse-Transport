import { apiGet, apiPatch } from "@/lib/api-client";
import { isCrewRole } from "@/lib/constants";
import type { ViewKey } from "@/store/app-store";

export const NOTIFICATIONS_CHANGED_EVENT = "equideli:notifications-changed";

export interface NotificationItem {
  notificationId: string;
  type: string;
  title: string;
  message: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationDestination {
  view: ViewKey;
  params: Record<string, string>;
}

export function notificationDestination(
  notification: NotificationItem,
  roleId: string,
): NotificationDestination | null {
  const id = notification.relatedEntityId;
  if (!id) return null;

  switch (notification.relatedEntityType) {
    case "transport_requests":
      return isCrewRole(roleId) ? null : { view: "request-detail", params: { id } };
    case "transport_plans":
      if (isCrewRole(roleId)) return { view: "trip-detail", params: { id } };
      return ["CUSTOMER", "LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST", "FLEET_COORDINATOR"].includes(roleId)
        ? { view: "plan-detail", params: { id } }
        : null;
    case "invoices":
      return ["CUSTOMER", "LOGISTICS_MANAGER"].includes(roleId)
        ? { view: "invoice-detail", params: { id } }
        : null;
    case "inspection_statuses":
      return roleId === "TRANSPORT_SPECIALIST"
        ? { view: "inspection-detail", params: { id } }
        : null;
    default:
      return null;
  }
}

interface UnreadCountResponse {
  count: number;
}

export const getNotifications = (unreadOnly = false) =>
  apiGet<NotificationItem[]>(`/notifications?unreadOnly=${unreadOnly}`);

export const getUnreadNotificationCount = async () =>
  (await apiGet<UnreadCountResponse>("/notifications/unread-count")).count;

export const markNotificationRead = (notificationId: string) =>
  apiPatch<NotificationItem>(`/notifications/${notificationId}/read`);

export const markAllNotificationsRead = () =>
  apiPatch<UnreadCountResponse>("/notifications/read-all");

export function notifyNotificationsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
}

export function notificationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Thời gian chưa xác định"
    : date.toLocaleString("vi-VN");
}
