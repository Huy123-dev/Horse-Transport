import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewKey =
  | "dashboard"
  | "horses"
  | "horse-detail"
  | "requests"
  | "request-create"
  | "request-detail"
  | "inspections"
  | "inspection-detail"
  | "approvals"
  | "approval-detail"
  | "plans"
  | "plan-create"
  | "plan-detail"
  | "trips"
  | "trip-detail"
  | "staff"
  | "pricing"
  | "fleet"
  | "notifications"
  | "compliance"
  | "invoices"
  | "invoice-detail"
  | "claims-management"
  | "feedback-management"
  | "recovery-dashboard";


export type PublicView =
  | "home"
  | "services"
  | "process"
  | "specialist-info"
  | "coordinator-info"
  | "driver-info"
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password";

interface AppState {

  user: {
    userId: string;
    email: string;
    name: string;
    roleId: string;
    roleName: string;
    organizationName: string | null;
    staffType?: "DRIVER" | "ESCORT" | null;
  } | null;
  setUser: (u: AppState["user"]) => void;


  view: ViewKey;
  params: Record<string, string>;
  navigate: (view: ViewKey, params?: Record<string, string>) => void;


  publicView: PublicView;
  navigatePublic: (view: PublicView) => void;


  intendedDestination: ViewKey | null;
  setIntendedDestination: (view: ViewKey | null) => void;


  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),

      view: "dashboard",
      params: {},
      navigate: (view, params = {}) => {
        set({ view, params });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },

      publicView: "home",
      navigatePublic: (publicView) => {
        set({ publicView });
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      },

      intendedDestination: null,
      setIntendedDestination: (view) => set({ intendedDestination: view }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: "equideli-app",
      partialize: (state) => ({
        user: state.user,
        view: state.view,
        params: state.params,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
