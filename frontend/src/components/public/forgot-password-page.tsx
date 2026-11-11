"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { apiPost } from "@/lib/api-client";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CircleHelp, Loader2, Mail } from "lucide-react";

export function ForgotPasswordPage() {
  const { navigatePublic } = useAppStore();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await apiPost<{ message: string }>("/auth/password-reset/request", { email });
      setMessage(response.message);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Không thể gửi yêu cầu đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Khôi phục mật khẩu">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Nhập email tài khoản. Nếu email khớp với tài khoản đang hoạt động, hướng dẫn đặt lại có thể được gửi đến hộp thư.
        </p>
        {message && (
          <Alert>
            <CircleHelp className="h-4 w-4" />
            <AlertTitle>Yêu cầu đã được tiếp nhận</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <CircleHelp className="h-4 w-4" />
            <AlertTitle>Chưa thể xử lý yêu cầu</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-9"
                placeholder="email@example.com"
                required
                maxLength={255}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang xử lý...</> : "Gửi hướng dẫn"}
          </Button>
        </form>
        <Button variant="outline" onClick={() => navigatePublic("login")} className="w-full gap-2">
          <ArrowLeft className="h-4 w-4" /> Quay lại đăng nhập
        </Button>
      </div>
    </AuthLayout>
  );
}
