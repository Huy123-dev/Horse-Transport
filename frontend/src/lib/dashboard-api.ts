import { apiGet } from "@/lib/api-client";

export interface RevenueByCurrency {
  currency: string;
  amount: number;
}

export interface DashboardStats {
  totalTransportRequests: number;
  inProgressPlans: number;
  completedPlans: number;
  paidRevenueByCurrency: RevenueByCurrency[];
}

export const getDashboardStats = () => apiGet<DashboardStats>("/dashboard/stats");
