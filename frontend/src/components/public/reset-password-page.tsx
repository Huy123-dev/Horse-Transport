"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { apiPost } from "@/lib/api-client";
import { PASSWORD_RESET_TOKEN_STORAGE_KEY } from "@/lib/password-reset";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CircleHelp, Loader2, Lock } from "lucide-react";

export function ResetPasswordPage() {
  const { navigatePublic } = useAppStore();
  const [token] = useState(() => sessionStorage.getItem(PASSWORD_RESET_TOKEN_STORAGE_KEY) ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError("Mật khẩu phải có từ 8 đến 72 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost<{ message: string }>("/auth/password-reset/confirm", { token, password });
      setSuccess(response.message);
      sessionStorage.removeItem(PASSWORD_RESET_TOKEN_STORAGE_KEY);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Không thể đặt lại mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Đặt lại mật khẩu">
      <div className="space-y-5">
        {!token && (
          <Alert variant="destructive">
            <CircleHelp className="h-4 w-4" />
            <AlertTitle>Liên kết không hợp lệ</AlertTitle>
            <AlertDescription>Hãy sử dụng liên kết trong email đặt lại mật khẩu hoặc yêu cầu gửi liên kết mới.</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <CircleHelp className="h-4 w-4" />
            <AlertTitle>Không thể đặt lại mật khẩu</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <CircleHelp className="h-4 w-4" />
            <AlertTitle>Đặt lại thành công</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {token && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="new-password" type="password" autoComplete="new-password" value={password}
                  onChange={(event) => setPassword(event.target.value)} className="pl-9"
                  minLength={8} maxLength={72} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8} maxLength={72} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang cập nhật...</> : "Đặt lại mật khẩu"}
            </Button>
          </form>
        )}
        <Button
          variant="outline"
          onClick={() => {
            navigatePublic("login");
            if (success) window.dispatchEvent(new Event("equideli:password-reset-complete"));
          }}
          className="w-full gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> {success ? "Đăng nhập" : "Quay lại đăng nhập"}
        </Button>
      </div>
    </AuthLayout>
  );
}
