"use client";

/**
 * ============================================================================
 * EQUIDELI — QUẢN LÝ NHÂN SỰ NỘI BỘ (STAFF MANAGEMENT VIEW)
 * ============================================================================
 * Màn hình này dành cho Quản lý Logistics (`LOGISTICS_MANAGER`) để:
 * 1. Xem danh sách toàn bộ tài khoản nhân viên nội bộ được nhóm theo từng vai trò (`byRole`).
 * 2. Tạo tài khoản nhân viên mới (`POST /users`) hoặc chỉnh sửa thông tin (`PUT /users/{id}`).
 * 3. Phân loại nhiệm vụ hiện trường (`staffType`: `DRIVER` hoặc `ESCORT`) cho nhân sự
 *    vận chuyển để hệ thống hiển thị đúng giao diện Tài xế hoặc Nhân viên đi kèm.
 * 4. Kích hoạt hoặc tạm ngưng tài khoản nhân viên (`PATCH /users/{id}/active`),
 *    đồng thời ngăn chặn việc tự vô hiệu hóa chính tài khoản đang đăng nhập.
 * ============================================================================
 */

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Phone,
  Mail,
  Building2,
  UserPlus,
  Loader2,
  X,
  Pencil,
  UserRoundX,
  UserRoundCheck,
  Truck,
  ShieldAlert,
  UserX,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { RoleBadge, getRoleConfig } from "@/components/app/role-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Cấu trúc thông tin tài khoản nhân sự trả về từ API `/users` */
interface StaffUser {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  organizationName: string | null;
  roleId: string;
  staffType?: "DRIVER" | "ESCORT" | null;
  avatarUrl?: string | null;
  active: boolean;
}

/** Danh sách các vai trò nội bộ có thể khởi tạo hoặc phân quyền */
const STAFF_ROLES = [
  { id: "LOGISTICS_MANAGER", label: "Quản lý Logistics" },
  { id: "TRANSPORT_SPECIALIST", label: "Chuyên viên Thủ tục & Kiểm dịch" },
  { id: "FLEET_COORDINATOR", label: "Điều phối viên Đội xe & Lộ trình" },
  { id: "DRIVER_ESCORT", label: "Nhân viên vận chuyển hiện trường" },
  { id: "DRIVER", label: "Tài xế" },
  { id: "ESCORT", label: "Nhân viên đi kèm" },
];

/** Tập hợp các mã vai trò thuộc nhóm nhân sự vận hành hiện trường */
const FIELD_STAFF_ROLES = new Set(["DRIVER_ESCORT", "DRIVER", "ESCORT"]);

export function StaffView() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    organizationName: "",
    roleId: "DRIVER_ESCORT",
    staffType: "DRIVER" as "DRIVER" | "ESCORT" | "",
    password: "",
  });

  const [activeTab] = useState<"STAFF" | "CUSTOMERS">("STAFF");
  const [customers, setCustomers] = useState<StaffUser[]>([]);
  const [restrictedCustomerIds, setRestrictedCustomerIds] = useState<Set<string>>(new Set());
  const [blacklistModalOpen, setBlacklistModalOpen] = useState(false);
  const [blCustomer, setBlCustomer] = useState<StaffUser | null>(null);
  const [blReason, setBlReason] = useState("UNPAID_INVOICE");
  const [blDescription, setBlDescription] = useState("");
  const [blAmountDue, setBlAmountDue] = useState("");
  const [blDueDate, setBlDueDate] = useState("");
  const [blRequestId, setBlRequestId] = useState("");
  const [blInvoiceId, setBlInvoiceId] = useState("");
  const [blSaving, setBlSaving] = useState(false);

  const fetchUsers = useCallback(() => apiGet<StaffUser[]>("/users"), []);

  /** Tải danh sách khách hàng và trạng thái hạn chế hiện tại */
  const loadCustomers = useCallback(async () => {
    try {
      const [custList, blList] = await Promise.all([
        apiGet<StaffUser[]>("/users?role=CUSTOMER"),
        apiGet<Array<{ customerId: string }>>("/blacklist?status=RESTRICTED"),
      ]);
      setCustomers(custList);
      setRestrictedCustomerIds(new Set(blList.map((b) => b.customerId)));
    } catch {
      // Không chặn luồng chính nếu tải danh sách khách hàng phụ gặp lỗi
    }
  }, []);

  /** Tải lại toàn bộ danh sách nhân sự */
  const load = useCallback(async () => {
    try {
      const loadedUsers = await fetchUsers();
      setUsers(loadedUsers);
      setError("");
      await loadCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải danh sách nhân viên.");
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, loadCustomers]);

  const openBlacklistForCustomer = (cust: StaffUser) => {
    setBlCustomer(cust);
    setBlReason("UNPAID_INVOICE");
    setBlDescription("");
    setBlAmountDue("");
    setBlDueDate("");
    setBlRequestId("");
    setBlInvoiceId("");
    setBlacklistModalOpen(true);
  };

  /** Thực thi đưa khách hàng vào danh sách hạn chế (`POST /blacklist`) */
  const handleExecuteBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blCustomer) return;
    setBlSaving(true);
    try {
      await apiPost("/blacklist", {
        customerId: blCustomer.userId,
        reason: blReason,
        description: blDescription.trim() || null,
        relatedRequestId: blRequestId.trim() || null,
        relatedInvoiceId: blInvoiceId.trim() || null,
        amountDue: blAmountDue ? parseFloat(blAmountDue) : null,
        dueDate: blDueDate || null,
      });

      toast({
        title: "Đã đưa khách hàng vào danh sách hạn chế",
        description: `Tài khoản ${blCustomer.name} đã bị hạn chế tạo đơn mới.`,
      });

      setBlacklistModalOpen(false);
      await loadCustomers();
    } catch (err: unknown) {
      toast({
        title: "Thao tác thất bại",
        description: err instanceof Error ? err.message : "Lỗi xử lý.",
        variant: "destructive",
      });
    } finally {
      setBlSaving(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchUsers()
      .then((loadedUsers) => {
        if (active) {
          setUsers(loadedUsers);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải danh sách nhân viên.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchUsers]);

  /** Khởi tạo biểu mẫu tạo mới nhân viên */
  const startCreate = () => {
    setEditingId(null);
    setFormOpen(true);
    setCreateForm({
      name: "",
      email: "",
      phone: "",
      organizationName: "",
      roleId: "DRIVER_ESCORT",
      staffType: "DRIVER",
      password: "",
    });
  };

  /** Đổ dữ liệu của nhân viên đang chọn vào biểu mẫu để chỉnh sửa */
  const startEdit = (staff: StaffUser) => {
    setEditingId(staff.userId);
    setFormOpen(true);
    setCreateForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phoneNumber ?? "",
      organizationName: staff.organizationName ?? "",
      roleId: staff.roleId,
      staffType: (staff.staffType as "DRIVER" | "ESCORT") || "",
      password: "",
    });
  };

  /**
   * Lưu thông tin nhân viên (Tạo mới qua `POST /users` hoặc Cập nhật qua `PUT /users/{id}`).
   */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.phone || (!editingId && !createForm.password)) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập họ tên, email, số điện thoại và mật khẩu cho nhân viên mới.",
        variant: "destructive",
      });
      return;
    }
    setCreateLoading(true);
    try {
      const isFieldStaff = FIELD_STAFF_ROLES.has(createForm.roleId);
      const payload = {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        organizationName: createForm.organizationName,
        roleId: createForm.roleId,
        staffType: isFieldStaff && createForm.staffType ? createForm.staffType : null,
        password: createForm.password || null,
      };
      if (editingId) {
        await apiPut(`/users/${editingId}`, payload);
      } else {
        await apiPost("/users", payload);
      }
      toast({
        title: editingId ? "Cập nhật nhân viên thành công" : "Tạo tài khoản thành công",
        description: `${ROLE_LABELS[createForm.roleId] || createForm.roleId} · ${createForm.name}`,
      });
      setEditingId(null);
      setFormOpen(false);
      await load();
    } catch (err) {
      toast({
        title: editingId ? "Cập nhật nhân viên thất bại" : "Tạo tài khoản thất bại",
        description: err instanceof Error ? err.message : "Không thể lưu tài khoản.",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  /** Bật/tắt trạng thái hoạt động của nhân viên (`PATCH /users/{userId}/active`) */
  const toggleActive = async (staff: StaffUser) => {
    try {
      const updated = await apiPatch<StaffUser>(`/users/${staff.userId}/active`, { active: !staff.active });
      setUsers((current) => current.map((item) => (item.userId === updated.userId ? updated : item)));
      toast({ title: updated.active ? "Đã kích hoạt nhân viên" : "Đã vô hiệu hóa nhân viên" });
    } catch (err) {
      toast({
        title: "Không thể cập nhật trạng thái nhân viên",
        description: err instanceof Error ? err.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  // Nhóm danh sách nhân sự theo từng mã vai trò (roleId) để hiển thị thành các phân khu rõ ràng
  const byRole: Record<string, StaffUser[]> = {};
  users.forEach((u) => {
    (byRole[u.roleId] = byRole[u.roleId] || []).push(u);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý nhân sự"
        description="Danh sách nhân viên theo vai trò nghiệp vụ và phân công nhiệm vụ vận hành hiện trường."
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button onClick={startCreate} className="gap-2 font-semibold">
            <UserPlus className="h-4 w-4" /> Tạo nhân viên
          </Button>
        }
      />

      {formOpen && (
        <Card className="border-primary/30 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base text-[var(--text-primary)]">
              <span className="flex items-center gap-2">
                {editingId ? <Pencil className="h-4 w-4 text-primary" /> : <UserPlus className="h-4 w-4 text-primary" />}
                {editingId ? "Cập nhật tài khoản nhân viên" : "Tạo tài khoản nhân viên nội bộ"}
              </span>
              <button onClick={() => setFormOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Họ và tên *</Label>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Nguyễn Văn B"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="email@equideli.com"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Số điện thoại *</Label>
                  <Input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="0901234567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vai trò nội bộ *</Label>
                  <select
                    value={createForm.roleId}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setCreateForm({
                        ...createForm,
                        roleId: newRole,
                        staffType:
                          newRole === "DRIVER"
                            ? "DRIVER"
                            : newRole === "ESCORT"
                              ? "ESCORT"
                              : createForm.staffType || "DRIVER",
                      });
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tùy chọn cấu hình loại nhiệm vụ cho nhân viên hiện trường */}
              {FIELD_STAFF_ROLES.has(createForm.roleId) && (
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-3.5 space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5 text-[var(--text-primary)]">
                    <Truck className="h-4 w-4 text-primary" /> Phân loại nhiệm vụ hiện trường *
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2.5 rounded-md border border-border bg-card p-3 cursor-pointer transition-colors hover:border-primary">
                      <input
                        type="radio"
                        name="staffTypeRadio"
                        value="DRIVER"
                        checked={createForm.staffType === "DRIVER"}
                        onChange={() => setCreateForm({ ...createForm, staffType: "DRIVER" })}
                        className="text-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Tài xế chuyên trách</p>
                        <p className="text-xs text-[var(--text-secondary)]">Phụ trách phương tiện, lộ trình và ký xác nhận bàn giao</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-2.5 rounded-md border border-border bg-card p-3 cursor-pointer transition-colors hover:border-primary">
                      <input
                        type="radio"
                        name="staffTypeRadio"
                        value="ESCORT"
                        checked={createForm.staffType === "ESCORT"}
                        onChange={() => setCreateForm({ ...createForm, staffType: "ESCORT" })}
                        className="text-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">Nhân viên đi kèm</p>
                        <p className="text-xs text-[var(--text-secondary)]">Chăm sóc thể trạng, đo sinh hiệu và ghi chép sức khỏe ngựa</p>
                      </div>
                    </label>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Loại nhiệm vụ này sẽ quyết định giao diện điều khiển và bộ quyền tác vụ khi nhân viên đăng nhập.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Đơn vị / Tổ chức (tùy chọn)</Label>
                <Input
                  maxLength={150}
                  value={createForm.organizationName}
                  onChange={(e) => setCreateForm({ ...createForm, organizationName: e.target.value })}
                  placeholder="Ví dụ: Đội vận chuyển EQUIDELI Miền Nam"
                />
              </div>

              <div className="space-y-2">
                <Label>Mật khẩu {editingId ? "(để trống để giữ nguyên)" : "*"}</Label>
                <Input
                  type="password"
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required={!editingId}
                  placeholder={editingId ? "••••••••" : "Tối thiểu 8 ký tự"}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createLoading} className="gap-2 font-semibold">
                  {createLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> {editingId ? "Lưu thay đổi" : "Tạo tài khoản"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "STAFF" && Object.entries(byRole).map(([roleId, list]) => (
        <Card key={roleId}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RoleBadge roleId={roleId} size="default" />
              <span className="text-sm text-[var(--text-secondary)]">{list.length} nhân viên</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((u) => {
                const displayStaffType = u.staffType || (u.roleId === "DRIVER" ? "DRIVER" : u.roleId === "ESCORT" ? "ESCORT" : null);
                const staffRole = getRoleConfig(u.roleId, displayStaffType);

                return (
                  <div
                    key={u.userId}
                    className={`rounded-lg border border-border p-4 transition-all hover:border-primary/40 ${
                      u.active ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        className="h-10 w-10 border-2 transition-all"
                        style={{ borderColor: staffRole.color }}
                      >
                        <AvatarFallback
                          className="text-xs font-bold"
                          style={{ backgroundColor: staffRole.color + "20", color: staffRole.color }}
                        >
                          {u.name
                            .split(" ")
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{u.name}</p>
                        <div className="mt-1">
                          <RoleBadge roleId={u.roleId} staffType={displayStaffType} size="sm" />
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[11px] ${
                          u.active
                            ? "bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)]"
                            : "bg-muted text-[var(--text-muted)] border-border"
                        }`}
                      >
                        {u.active ? "Đang hoạt động" : "Tạm ngưng"}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)] border-t border-border/50 pt-2.5">
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{u.email}</span>
                      </p>
                      {u.phoneNumber && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 shrink-0" /> {u.phoneNumber}
                        </p>
                      )}
                      {u.organizationName && (
                        <p className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 shrink-0" /> {u.organizationName}
                        </p>
                      )}
                    </div>

                    <div className="mt-3.5 flex justify-end gap-2 border-t border-border/40 pt-2.5">
                      <Button variant="outline" size="sm" onClick={() => startEdit(u)} className="gap-1 h-8 text-xs">
                        <Pencil className="h-3.5 w-3.5" /> Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={u.userId === user?.userId}
                        onClick={() => void toggleActive(u)}
                        className="gap-1 h-8 text-xs"
                      >
                        {u.active ? <UserRoundX className="h-3.5 w-3.5" /> : <UserRoundCheck className="h-3.5 w-3.5" />}
                        {u.active ? "Vô hiệu hóa" : "Kích hoạt"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Khu vực hiển thị danh sách Khách hàng (nếu chuyển tab) */}
      {activeTab === "CUSTOMERS" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((c) => {
              const isRestricted = restrictedCustomerIds.has(c.userId);
              const initials = c.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

              return (
                <div
                  key={c.userId}
                  className={`rounded-lg border p-4 transition-all ${
                    isRestricted ? "border-[var(--danger-border)] bg-[var(--danger-bg)]/30" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.name} />}
                      <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{c.name}</p>
                      <span className="font-mono text-[10px] text-[var(--text-muted)] block">
                        Mã: {c.userId.slice(0, 8)}...
                      </span>
                    </div>
                    {isRestricted ? (
                      <Badge variant="outline" className="bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)] text-[10px] shrink-0">
                        Bị hạn chế
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)] text-[10px] shrink-0">
                        Đang hoạt động
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-[var(--text-secondary)] border-t border-border/50 pt-2.5">
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" /> {c.email}
                    </p>
                    {c.phoneNumber && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" /> {c.phoneNumber}
                      </p>
                    )}
                    {c.organizationName && (
                      <p className="flex items-center gap-2 truncate">
                        <Building2 className="h-3.5 w-3.5 shrink-0" /> {c.organizationName}
                      </p>
                    )}
                  </div>

                  <div className="mt-3.5 flex justify-end gap-2 border-t border-border/40 pt-2.5">
                    {isRestricted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => useAppStore.getState().navigate("blacklist")}
                        className="gap-1 h-8 text-xs text-[var(--danger-fg)] border-[var(--danger-border)] hover:bg-[var(--danger-bg)]"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" /> Xem hồ sơ hạn chế
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openBlacklistForCustomer(c)}
                        className="gap-1 h-8 text-xs text-[var(--danger-fg)] border-[var(--danger-border)] hover:bg-[var(--danger-bg)]"
                      >
                        <UserX className="h-3.5 w-3.5" /> Thêm vào danh sách hạn chế
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hộp thoại đưa khách hàng vào danh sách hạn chế */}
      {blCustomer && (
        <Dialog open={blacklistModalOpen} onOpenChange={setBlacklistModalOpen}>
          <DialogContent className="sm:max-w-[480px] border-border bg-card">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <UserX className="h-4 w-4 text-[var(--danger-fg)]" />
                Hạn chế tài khoản: {blCustomer.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)]">
                Tài khoản khách hàng sẽ bị hạn chế tạo đơn mới nhưng vẫn được phép đăng nhập gửi kiến nghị và chứng từ thanh toán.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleExecuteBlacklist} className="space-y-3.5 pt-2 text-xs">
              <div className="p-3 bg-muted/20 rounded-lg space-y-1 border border-border">
                <p><span className="text-[var(--text-secondary)]">Khách hàng:</span> <strong className="text-[var(--text-primary)]">{blCustomer.name}</strong></p>
                <p><span className="text-[var(--text-secondary)]">Email:</span> {blCustomer.email}</p>
                <p className="font-mono text-[10px] text-[var(--text-muted)]">Mã định danh: {blCustomer.userId}</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Lý do hạn chế *</Label>
                <select
                  value={blReason}
                  onChange={(e) => setBlReason(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="UNPAID_INVOICE">Chưa thanh toán hóa đơn</option>
                  <option value="OUTSTANDING_DEBT">Còn công nợ vận chuyển</option>
                  <option value="SERVICE_VIOLATION">Vi phạm điều kiện dịch vụ</option>
                  <option value="INACCURATE_INFO">Cung cấp thông tin không chính xác</option>
                  <option value="TRANSPORT_VIOLATION">Vi phạm quy định vận chuyển</option>
                  <option value="IMPACT_OPERATION">Có hành vi gây ảnh hưởng dịch vụ</option>
                  <option value="OTHER">Lý do khác</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[var(--text-primary)]">Mô tả vi phạm {blReason === "OTHER" && "*"}</Label>
                <textarea
                  value={blDescription}
                  onChange={(e) => setBlDescription(e.target.value)}
                  placeholder="Mô tả chi tiết vi phạm..."
                  required={blReason === "OTHER"}
                  className="w-full rounded-md border border-input bg-background p-2 text-xs min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[var(--text-primary)]">Số tiền cần thanh toán (USD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={blAmountDue}
                    onChange={(e) => setBlAmountDue(e.target.value)}
                    placeholder="1500.00"
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[var(--text-primary)]">Hạn thanh toán</Label>
                  <Input
                    type="date"
                    value={blDueDate}
                    onChange={(e) => setBlDueDate(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[var(--text-primary)]">Mã đơn liên quan</Label>
                  <Input
                    value={blRequestId}
                    onChange={(e) => setBlRequestId(e.target.value)}
                    placeholder="Mã định danh đơn..."
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[var(--text-primary)]">Mã hóa đơn liên quan</Label>
                  <Input
                    value={blInvoiceId}
                    onChange={(e) => setBlInvoiceId(e.target.value)}
                    placeholder="Mã định danh hóa đơn..."
                    className="h-8 text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="mt-4 border-t border-border/60 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setBlacklistModalOpen(false)}>Hủy</Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={blSaving}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                >
                  {blSaving ? "Đang lưu..." : "Xác nhận hạn chế"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
