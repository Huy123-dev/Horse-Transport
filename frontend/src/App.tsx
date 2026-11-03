import { lazy, Suspense, useEffect, useState } from "react";
import { ApiError, apiGet } from "@/lib/api-client";
import { PASSWORD_RESET_TOKEN_STORAGE_KEY } from "@/lib/password-reset";
import { useAppStore } from "@/store/app-store";
import { ErrorState, LoadingState } from "@/components/app/empty-state";

const PublicSite = lazy(() => import("@/components/public/public-site").then((module) => ({ default: module.PublicSite })));
const AppShell = lazy(() => import("@/components/app/app-shell").then((module) => ({ default: module.AppShell })));
function initializePasswordResetFlow(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  if (token) {
    sessionStorage.setItem(PASSWORD_RESET_TOKEN_STORAGE_KEY, token);
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", url.toString());
  }
  return Boolean(token || sessionStorage.getItem(PASSWORD_RESET_TOKEN_STORAGE_KEY));
}

interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  phoneNumber: string | null;
  organizationName: string | null;
  roleId: string;
  staffType?: "DRIVER" | "ESCORT" | null;
}

export default function App() {
  const { user, setUser, intendedDestination, navigate, setIntendedDestination } = useAppStore();
  const [passwordResetFlow, setPasswordResetFlow] = useState(initializePasswordResetFlow);
  const [checking, setChecking] = useState(() => !passwordResetFlow);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (passwordResetFlow) return;
    let active = true;
    (async () => {
      try {
        const data = await apiGet<AuthenticatedUser>("/auth/me");
        if (active) {
          setUser({ ...data, roleName: data.roleId, staffType: data.staffType ?? null });

          if (intendedDestination) {

            if (data.roleId === "CUSTOMER" && intendedDestination === "request-create") {
              navigate(intendedDestination);
            } else {
              navigate("dashboard");
            }
            setIntendedDestination(null);
          }
        }
      } catch (err: unknown) {
        if (active) {
          if (err instanceof ApiError && err.status === 401) {
            setUser(null);
          } else {
            setAuthError(err instanceof Error ? err.message : "Không thể xác minh phiên đăng nhập.");
          }
        }
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, [passwordResetFlow, setUser]);

  useEffect(() => {
    const handleResetComplete = () => {
      useAppStore.getState().setUser(null);
      setPasswordResetFlow(false);
    };
    window.addEventListener("equideli:password-reset-complete", handleResetComplete);
    return () => window.removeEventListener("equideli:password-reset-complete", handleResetComplete);
  }, []);

  useEffect(() => {
    if (checking || !user || !intendedDestination) return;

    if (user.roleId === "CUSTOMER" && intendedDestination === "request-create") {
      navigate(intendedDestination);
    } else {
      navigate("dashboard");
    }
    setIntendedDestination(null);
  }, [checking, intendedDestination, navigate, setIntendedDestination, user]);

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <LoadingState className="py-0" />
      </div>
    );
  }

  if (authError) return <ErrorState message={authError} />;
  return (
    <Suspense fallback={<LoadingState className="py-0" />}>
      {passwordResetFlow ? <PublicSite initialView="reset-password" /> : !user ? <PublicSite /> : <AppShell />}
    </Suspense>
  );
}
