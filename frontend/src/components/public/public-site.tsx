"use client";

import { useAppStore, type PublicView } from "@/store/app-store";
import { PublicHeader } from "./public-header";
import { PublicFooter } from "./public-footer";
import { HomePage } from "./home-page";
import { ServicesPage } from "./services-page";
import { ProcessPage } from "./process-page";
import { LoginView } from "@/components/views/login-view";
import { RegisterPage } from "./register-page";
import { ForgotPasswordPage } from "./forgot-password-page";
import { ResetPasswordPage } from "./reset-password-page";
import { RoleOverviewPage } from "./role-overview-page";

export function PublicSite({ initialView }: { initialView?: PublicView }) {
  const { publicView: storedPublicView } = useAppStore();
  const publicView = initialView ?? storedPublicView;


  if (publicView === "login") return <LoginView />;
  if (publicView === "register") return <RegisterPage />;
  if (publicView === "forgot-password") return <ForgotPasswordPage />;
  if (publicView === "reset-password") return <ResetPasswordPage />;
  if (publicView === "specialist-info") return <RoleOverviewPage role="specialist" />;
  if (publicView === "coordinator-info") return <RoleOverviewPage role="coordinator" />;
  if (publicView === "driver-info") return <RoleOverviewPage role="driver" />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        {publicView === "home" && <HomePage />}
        {publicView === "services" && <ServicesPage />}
        {publicView === "process" && <ProcessPage />}
      </main>
      <PublicFooter />
    </div>
  );
}
