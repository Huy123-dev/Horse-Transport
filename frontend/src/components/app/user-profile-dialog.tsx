"use client";

/**
 * ============================================================================
 * EQUIDELI — HỘP THOẠI HỒ SƠ CÁ NHÂN THỐNG NHẤT (UNIFIED USER PROFILE DIALOG)
 * ============================================================================
 * Component này cung cấp giao diện xem và chỉnh sửa hồ sơ cá nhân thống nhất
 * cho tất cả 6 vai trò (Customer, Logistics Manager, Transport Specialist,
 * Fleet Coordinator, Driver, Escort) khi nhấn vào khu vực Avatar trên Header.
 *
 * Các chức năng chính:
 * 1. Tải thông tin hồ sơ mới nhất từ API `GET /profile/me`.
 * 2. Xem trước, tải lên (`POST /profile/avatar`) hoặc xóa (`DELETE /profile/avatar`)
 *    ảnh đại diện (kiểm tra định dạng JPG/PNG/WEBP và dung lượng <= 5MB).
 * 3. Cập nhật họ tên, số điện thoại, tên tổ chức/trang trại (`PUT /profile/me`).
 * 4. Đổi mật khẩu đăng nhập (`PUT /profile/password`).
 * 5. Hiển thị mã định danh (User ID), vai trò chính thức, phân loại nghiệp vụ và đăng xuất.
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RoleBadge, getRoleConfig } from "@/components/app/role-badge";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { api, apiPostFormData, apiDelete, apiPut } from "@/lib/api-client";
import {
  Camera,
  Trash2,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  User as UserIcon,
  Calendar,
  Briefcase,
  LogOut,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Cấu trúc dữ liệu hồ sơ người dùng trả về từ Backend */
interface ProfileData {
  userId: string;
  email: string;
  name: string;
  phoneNumber?: string | null;
  organizationName?: string | null;
  roleId: string;
  roleName: string;
  staffType?: "DRIVER" | "ESCORT" | null;
  avatarUrl?: string | null;
  active: boolean;
  createdAt?: string | null;
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { user, setUser } = useAppStore();
  const { toast } = useToast();

  // Trạng thái tải dữ liệu và lưu hồ sơ
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  // Trạng thái các trường thông tin cá nhân có thể chỉnh sửa
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");

  // Trạng thái quản lý ảnh đại diện (Avatar)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trạng thái khu vực đổi mật khẩu
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Trạng thái sao chép mã định danh người dùng
  const [copiedId, setCopiedId] = useState(false);

  /**
   * Mỗi khi mở hộp thoại hồ sơ (open = true), gọi API `/profile/me`
   * để lấy dữ liệu mới nhất từ máy chủ. Khi đóng hộp thoại, xóa các trạng thái tạm.
   */
  useEffect(() => {
    if (!open) {
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarRemoved(false);
      setShowPasswordSection(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    let active = true;
    async function fetchProfile() {
      setLoading(true);
      try {
        const data = await api<ProfileData>("/profile/me");
        if (!active) return;
        setProfile(data);
        setName(data.name || "");
        setPhoneNumber(data.phoneNumber || "");
        setOrganizationName(data.organizationName || "");
        setAvatarPreview(data.avatarUrl || null);
        setAvatarRemoved(false);
        setAvatarFile(null);
      } catch {
        // Nếu gọi API gặp sự cố tạm thời, sử dụng thông tin đang lưu trong Store làm dự phòng
        if (!active) return;
        if (user) {
          setName(user.name || "");
          setPhoneNumber(user.phoneNumber || "");
          setOrganizationName(user.organizationName || "");
          setAvatarPreview(user.avatarUrl || null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchProfile();
    return () => {
      active = false;
    };
  }, [open, user]);

  // Lấy cấu hình màu sắc và tên hiển thị theo vai trò
  const roleConfig = getRoleConfig(
    profile?.roleId || user?.roleId,
    profile?.staffType || user?.staffType
  );

  // Tạo chữ cái viết tắt từ họ tên để hiển thị khi người dùng chưa có ảnh đại diện
  const initials = (name || user?.name || "U")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  /**
   * Xử lý khi người dùng chọn tệp ảnh đại diện mới từ máy tính.
   * Kiểm tra dung lượng tối đa 5MB và định dạng hợp lệ (JPG, PNG, WEBP).
   */
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxFileSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSizeBytes) {
      toast({
        title: "Dung lượng ảnh vượt quá giới hạn",
        description: "Vui lòng chọn ảnh có kích thước dưới 5MB.",
        variant: "destructive",
      });
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast({
        title: "Định dạng không hỗ trợ",
        description: "Chỉ chấp nhận định dạng JPG, PNG hoặc WEBP.",
        variant: "destructive",
      });
      return;
    }

    setAvatarFile(file);
    setAvatarRemoved(false);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  /** Đánh dấu xóa ảnh đại diện hiện tại */
  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /** Sao chép mã định danh (UUID) của người dùng vào bộ nhớ tạm */
  const handleCopyUserId = () => {
    const id = profile?.userId || user?.userId;
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast({ title: "Đã sao chép mã định danh", description: id });
    setTimeout(() => setCopiedId(false), 2000);
  };

  /**
   * Lưu toàn bộ thay đổi hồ sơ cá nhân:
   * 1. Xử lý xóa hoặc tải ảnh đại diện mới lên Server (nếu có thay đổi).
   * 2. Cập nhật thông tin cá nhân qua `PUT /profile/me`.
   * 3. Đồng bộ lại dữ liệu người dùng vào `useAppStore` để Header cập nhật ngay lập tức.
   */
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast({
        title: "Vui lòng nhập họ và tên",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let finalAvatarUrl = profile?.avatarUrl ?? user?.avatarUrl ?? null;

      if (avatarRemoved) {
        await apiDelete("/profile/avatar");
        finalAvatarUrl = null;
      } else if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        const res = await apiPostFormData<{ avatarUrl: string }>("/profile/avatar", formData);
        finalAvatarUrl = res.avatarUrl;
      }

      const updatedProfile = await apiPut<ProfileData>("/profile/me", {
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || null,
        organizationName: organizationName.trim() || null,
      });

      if (user) {
        setUser({
          ...user,
          name: updatedProfile.name,
          phoneNumber: updatedProfile.phoneNumber ?? null,
          organizationName: updatedProfile.organizationName ?? null,
          avatarUrl: finalAvatarUrl,
        });
      }

      toast({
        title: "Cập nhật hồ sơ thành công",
        description: "Thông tin tài khoản và ảnh đại diện đã được lưu.",
      });

      onOpenChange(false);
    } catch (err: unknown) {
      toast({
        title: "Không thể lưu hồ sơ",
        description: err instanceof Error ? err.message : "Đã xảy ra lỗi trong quá trình lưu.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Xử lý đổi mật khẩu đăng nhập:
   * Kiểm tra mật khẩu hiện tại, độ dài tối thiểu 6 ký tự và khớp mật khẩu xác nhận.
   */
  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({
        title: "Vui lòng nhập mật khẩu hiện tại",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Mật khẩu mới không hợp lệ",
        description: "Mật khẩu mới phải có tối thiểu 6 ký tự.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Xác nhận mật khẩu không khớp",
        description: "Vui lòng nhập lại mật khẩu xác nhận chính xác.",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      await apiPut("/profile/password", {
        currentPassword,
        newPassword,
      });

      toast({
        title: "Đổi mật khẩu thành công",
        description: "Mật khẩu đăng nhập mới đã được kích hoạt.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    } catch (err: unknown) {
      toast({
        title: "Đổi mật khẩu thất bại",
        description: err instanceof Error ? err.message : "Mật khẩu hiện tại không chính xác.",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  /** Đăng xuất khỏi hệ thống và xóa JWT token */
  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setUser(null);
    onOpenChange(false);
    toast({ title: "Đã đăng xuất", description: "Hẹn gặp lại bạn trên EQUIDELI." });
  };

  const currentRole = profile?.roleId || user?.roleId || "";
  const effectiveUserId = profile?.userId || user?.userId || "—";
  const effectiveEmail = profile?.email || user?.email || "—";
  const effectiveCreatedAt = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Đã xác minh";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto border-border bg-card p-6 shadow-2xl">
        <DialogHeader className="border-b border-border/60 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Hồ sơ cá nhân
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)] mt-1">
                Quản lý thông tin tài khoản, ảnh đại diện và bảo mật trên hệ thống EQUIDELI.
              </DialogDescription>
            </div>
            <RoleBadge
              roleId={currentRole}
              staffType={profile?.staffType || user?.staffType}
              size="default"
            />
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-secondary)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Đang tải thông tin hồ sơ...</p>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Phần A: Ảnh đại diện & Tóm tắt tài khoản */}
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
              <div className="relative group">
                <Avatar
                  className="h-24 w-24 border-3 shadow-md transition-transform"
                  style={{ borderColor: roleConfig.color }}
                >
                  {avatarPreview ? (
                    <AvatarImage
                      src={avatarPreview}
                      alt={name}
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback
                    className="text-2xl font-bold"
                    style={{
                      backgroundColor: roleConfig.color + "25",
                      color: roleConfig.color,
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-md hover:brightness-110 transition-all"
                  title="Thay đổi ảnh đại diện"
                  aria-label="Thay đổi ảnh đại diện"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] leading-tight">{name || "Chưa đặt tên"}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{effectiveEmail}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarSelect}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-border/80 gap-1.5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    {avatarPreview ? "Thay đổi ảnh" : "Tải ảnh mới"}
                  </Button>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-[var(--danger-fg)] hover:bg-[var(--danger-bg)] gap-1.5"
                      onClick={handleRemoveAvatar}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa ảnh
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Hỗ trợ định dạng JPG, PNG, WEBP. Kích thước tối đa 5MB.
                </p>
              </div>
            </div>

            {/* Phần B: Thông tin cá nhân có thể chỉnh sửa */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <UserIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Thông tin cá nhân
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="prof-name" className="text-xs font-medium text-[var(--text-primary)]">
                    Họ và tên <span className="text-[var(--danger-fg)]">*</span>
                  </Label>
                  <Input
                    id="prof-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ"
                    className="h-9 text-sm bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-phone" className="text-xs font-medium text-[var(--text-primary)]">
                    Số điện thoại
                  </Label>
                  <Input
                    id="prof-phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Ví dụ: 0912345678"
                    className="h-9 text-sm bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-org" className="text-xs font-medium text-[var(--text-primary)]">
                    Tên trang trại / Tổ chức đua ngựa
                  </Label>
                  <Input
                    id="prof-org"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Ví dụ: Trang trại ngựa đua Hoàng Gia"
                    className="h-9 text-sm bg-background border-border"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-email" className="text-xs font-medium text-[var(--text-secondary)]">
                    Email tài khoản (Định danh đăng nhập)
                  </Label>
                  <Input
                    id="prof-email"
                    value={effectiveEmail}
                    disabled
                    className="h-9 text-sm bg-muted/40 border-border text-[var(--text-secondary)] cursor-not-allowed"
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Email dùng để đăng nhập và nhận thông báo hệ thống, không thể sửa đổi.
                  </p>
                </div>
              </div>
            </div>

            {/* Phần C & D: Thông tin tài khoản & Quyền hạn theo Role */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Thông tin tài khoản & quyền hạn
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/20 border border-border/60 rounded-xl p-4">
                <div className="space-y-1">
                  <span className="text-[var(--text-secondary)] block text-[11px]">Mã định danh người dùng</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--text-primary)] font-medium select-all break-all">
                      {effectiveUserId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUserId}
                      className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-muted transition-colors shrink-0"
                      title="Sao chép mã định danh"
                    >
                      {copiedId ? <Check className="h-3.5 w-3.5 text-[var(--success-fg)]" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[var(--text-secondary)] block text-[11px]">Trạng thái tài khoản</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)] text-[11px] font-medium">
                      Đang hoạt động
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[var(--text-secondary)] block text-[11px]">Vai trò chính thức</span>
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] text-xs">{roleConfig.label}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[var(--text-secondary)] block text-[11px]">Ngày tham gia hệ thống</span>
                  <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                    <Calendar className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    <span>{effectiveCreatedAt}</span>
                  </div>
                </div>

                {/* Hiển thị phân loại nghiệp vụ chuyên biệt nếu là Nhân sự hiện trường (Driver / Escort) */}
                {(profile?.staffType || currentRole === "DRIVER_ESCORT" || currentRole === "DRIVER" || currentRole === "ESCORT") && (
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-border/40 mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[var(--text-secondary)] text-[11px]">Phân loại nghiệp vụ:</span>
                      <span className="font-semibold text-[var(--text-primary)]">
                        {profile?.staffType === "DRIVER"
                          ? "Tài xế chuyên trách vận chuyển ngựa"
                          : profile?.staffType === "ESCORT"
                          ? "Chuyên viên chăm sóc & hộ tống ngựa"
                          : "Tài xế / Hộ tống hiện trường"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phần E: Khu vực Đổi mật khẩu (có thể thu gọn/mở rộng) */}
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card/60">
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>Bảo mật & Đổi mật khẩu</span>
                </div>
                {showPasswordSection ? (
                  <ChevronUp className="h-4 w-4 text-[var(--text-secondary)]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
                )}
              </button>

              {showPasswordSection && (
                <div className="p-4 border-t border-border/60 space-y-3 bg-muted/10">
                  <div className="space-y-1">
                    <Label htmlFor="curr-pass" className="text-xs font-medium text-[var(--text-primary)]">
                      Mật khẩu hiện tại
                    </Label>
                    <Input
                      id="curr-pass"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="h-8 text-xs bg-background border-border"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="new-pass" className="text-xs font-medium text-[var(--text-primary)]">
                        Mật khẩu mới
                      </Label>
                      <Input
                        id="new-pass"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="h-8 text-xs bg-background border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="conf-pass" className="text-xs font-medium text-[var(--text-primary)]">
                        Xác nhận mật khẩu mới
                      </Label>
                      <Input
                        id="conf-pass"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="h-8 text-xs bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={changingPassword || !currentPassword || !newPassword}
                      onClick={handleChangePassword}
                      className="h-8 text-xs gap-1.5"
                    >
                      {changingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Cập nhật mật khẩu
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="mt-6 border-t border-border/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-[var(--danger-fg)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-fg)] h-9 text-xs gap-1.5 self-start sm:self-auto"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </Button>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-9 text-xs border-border"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveProfile}
              disabled={saving || loading}
              className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
