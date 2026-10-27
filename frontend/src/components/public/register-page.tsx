"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { AuthLayout } from "./auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, CheckCircle2, Mail, Lock, User, Phone, Building2 } from "lucide-react";

export function RegisterPage() {
  const { navigatePublic } = useAppStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", organizationName: "",
    password: "", confirmPassword: "", agreeTerms: false,
  });
  const phoneIsValid = /^0[0-9]{9}$/.test(form.phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);
    if (!form.name || !form.email || !form.phone || !form.organizationName || !form.password || !form.confirmPassword) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng điền đầy đủ các trường bắt buộc.", variant: "destructive" });
      return;
    }
    if (!phoneIsValid) {
      toast({ title: "Số điện thoại không hợp lệ", description: "Nhập đúng 10 chữ số và bắt đầu bằng 0.", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Mật khẩu không khớp", description: "Mật khẩu xác nhận phải trùng với mật khẩu.", variant: "destructive" });
      return;
    }
    if (form.password.length < 8 || form.password.length > 72) {
      toast({ title: "Mật khẩu không hợp lệ", description: "Mật khẩu phải có từ 8 đến 72 ký tự.", variant: "destructive" });
      return;
    }
    if (!form.agreeTerms) {
      toast({ title: "Chưa đồng ý điều khoản", description: "Vui lòng đồng ý với điều khoản sử dụng.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await apiPost("/auth/register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        organizationName: form.organizationName,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setSuccess(true);
      toast({ title: "Đăng ký thành công", description: "Tài khoản khách hàng đã được tạo." });
    } catch (err: unknown) {
      toast({ title: "Đăng ký thất bại", description: err instanceof Error ? err.message : "Không thể tạo tài khoản.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Đăng ký thành công!">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success-fg)]">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-sm text-muted-foreground">
            Tài khoản khách hàng của bạn đã được tạo. Vui lòng đăng nhập để bắt đầu sử dụng EQUIDELI.
          </p>
          <Button onClick={() => navigatePublic("login")} className="w-full gap-2">
            Đăng nhập ngay
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Đăng ký tài khoản" subtitle="Tạo tài khoản khách hàng để quản lý vận chuyển ngựa đua">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Họ và tên *</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-9" placeholder="Nguyễn Văn A" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-9" placeholder="email@example.com" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Số điện thoại *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={form.phone}
              onChange={(e) => {
                setPhoneTouched(true);
                setForm({ ...form, phone: e.target.value });
              }}
              className="pl-9"
              placeholder="0901234567"
              maxLength={10}
              pattern="0[0-9]{9}"
              aria-invalid={phoneTouched && !phoneIsValid}
              aria-describedby="phone-help"
              required
            />
          </div>
          <p id="phone-help" className={`text-xs ${phoneTouched && !phoneIsValid ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
            {phoneTouched && !phoneIsValid ? "Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng 0." : "Nhập 10 chữ số, bắt đầu bằng 0."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org">Tên trang trại / Đơn vị *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="org" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} className="pl-9" placeholder="VD: Trại Ngựa Củ Chi" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">Mật khẩu *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-9" placeholder="Ít nhất 8 ký tự" minLength={8} maxLength={72} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Xác nhận *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="confirm" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="pl-9" placeholder="Nhập lại mật khẩu" minLength={8} maxLength={72} required />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox id="terms" checked={form.agreeTerms} onCheckedChange={(v) => setForm({ ...form, agreeTerms: !!v })} />
          <Label htmlFor="terms" className="text-sm cursor-pointer leading-tight">
            Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của EQUIDELI.
          </Label>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-semibold gap-2" size="lg">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang đăng ký...</> : <><UserPlus className="h-4 w-4" /> Đăng ký</>}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <button type="button" onClick={() => navigatePublic("login")} className="font-semibold text-primary hover:underline">
            Đăng nhập
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
