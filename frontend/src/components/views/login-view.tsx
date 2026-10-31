"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Lock, Mail, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { GoogleSignInButton } from "@/components/views/google-sign-in-button";

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInMs: number;
  user: {
    userId: string;
    email: string;
    name: string;
    phoneNumber: string | null;
    organizationName: string | null;
    roleId: string;
    staffType?: "DRIVER" | "ESCORT" | null;
  };
}

export function LoginView() {
  const { setUser, navigatePublic } = useAppStore();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const completeLogin = (data: LoginResponse) => {
    const tokenStorage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem("token");
    tokenStorage.setItem("token", data.accessToken);
    setUser({ ...data.user, roleName: data.user.roleId, staffType: data.user.staffType ?? null });

    toast({ title: "Đăng nhập thành công", description: `Chào mừng, ${data.user.name}!` });
  };

  const handleGoogleCredential = async (idToken: string) => {
    setLoading(true);
    try {
      const data = await apiPost<LoginResponse>("/auth/google", { idToken });
      completeLogin(data);
    } catch (err: unknown) {
      toast({
        title: "Đăng nhập Google thất bại",
        description: err instanceof Error ? err.message : "Đã xảy ra lỗi khi đăng nhập bằng Google.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (message: string) => {
    toast({ title: "Đăng nhập Google thất bại", description: message, variant: "destructive" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost<LoginResponse>("/auth/login", { email, password });
      completeLogin(data);
    } catch (err: unknown) {
      toast({
        title: "Đăng nhập thất bại",
        description: err instanceof Error ? err.message : "Đã xảy ra lỗi khi đăng nhập.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-sidebar">
      {/* Background horse image — fixed, covers full viewport */}
      <div className="fixed inset-0 z-0">
        <img
          src="/equideli-login-bg.png"
          alt="Ngựa đua trong khoang vận chuyển chuyên nghiệp"
          className="h-full w-full object-cover object-center sm:object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar/90 via-sidebar/60 to-sidebar/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar/50 via-transparent to-sidebar/30" />
      </div>

      {/* Login card — centered */}
      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="rounded-2xl border border-primary/20 bg-card/95 shadow-2xl backdrop-blur-md">
          <div className="p-8">
            {/* Logo */}
            <div className="mb-6 flex flex-col items-center gap-3">
              <img src="/equideli-logo.png" alt="EQUIDELI" className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/20" />
              <div className="text-center">
                <p className="text-xl font-extrabold tracking-tight text-foreground">EQUIDELI</p>
                <p className="text-xs text-muted-foreground">Vận chuyển ngựa đua xuyên biên giới</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-bold text-foreground">Đăng nhập</h2>
                <p className="mt-1 text-sm text-muted-foreground">Đăng nhập để quản lý yêu cầu vận chuyển ngựa đua của bạn.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9" placeholder="email@example.com" required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <button
                    type="button"
                    onClick={() => navigatePublic("forgot-password")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9" placeholder="••••••••" required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                <Label htmlFor="remember" className="text-sm cursor-pointer">Ghi nhớ đăng nhập</Label>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-semibold" size="lg">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang đăng nhập...</> : "Đăng nhập"}
              </Button>

              {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">hoặc</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <GoogleSignInButton
                    onCredential={handleGoogleCredential}
                    onError={handleGoogleError}
                    disabled={loading}
                  />
                </>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Chưa có tài khoản?{" "}
                  <button
                    type="button"
                    onClick={() => navigatePublic("register")}
                    className="font-semibold text-primary hover:underline"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              </div>
            </form>

            {/* Back to home */}
            <div className="mt-6 text-center">
              <button
                onClick={() => navigatePublic("home")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-3 w-3" /> Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
