"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Phone, Mail, Building2, UserPlus, Loader2, X, Pencil, UserRoundX, UserRoundCheck } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

interface StaffUser {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  organizationName: string | null;
  roleId: string;
  active: boolean;
}

const STAFF_ROLES = [
  { id: "LOGISTICS_MANAGER", label: "Quản lý Logistics" },
  { id: "TRANSPORT_SPECIALIST", label: "Chuyên viên Thủ tục & Kiểm dịch" },
  { id: "FLEET_COORDINATOR", label: "Điều phối viên Đội xe & Lộ trình" },
  { id: "DRIVER", label: "Tài xế" },
  { id: "ESCORT", label: "Nhân viên đi kèm" },
  { id: "DRIVER_ESCORT", label: "Tài xế & Nhân viên đi kèm" },
];

export function StaffView() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", phone: "", organizationName: "", roleId: "DRIVER", password: "" });

  const fetchUsers = useCallback(() => apiGet<StaffUser[]>("/users"), []);

  const load = useCallback(async () => {
    try {
      const loadedUsers = await fetchUsers();
      setUsers(loadedUsers);
      setError("");
    }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể tải danh sách nhân viên."); }
    finally { setLoading(false); }
  }, [fetchUsers]);

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
    return () => { active = false; };
  }, [fetchUsers]);

  const startCreate = () => {
    setEditingId(null);
    setFormOpen(true);
    setCreateForm({ name: "", email: "", phone: "", organizationName: "", roleId: "DRIVER", password: "" });
  };

  const startEdit = (staff: StaffUser) => {
    setEditingId(staff.userId);
    setFormOpen(true);
    setCreateForm({
      name: staff.name,
      email: staff.email,
      phone: staff.phoneNumber ?? "",
      organizationName: staff.organizationName ?? "",
      roleId: staff.roleId,
      password: "",
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.phone || (!editingId && !createForm.password)) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập họ tên, email, số điện thoại và mật khẩu cho nhân viên mới.", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    try {
      const payload = {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        organizationName: createForm.organizationName,
        roleId: createForm.roleId,
        password: createForm.password || null,
      };
      if (editingId) {
        await apiPut(`/users/${editingId}`, payload);
      } else {
        await apiPost("/users", payload);
      }
      toast({ title: editingId ? "Cập nhật nhân viên thành công" : "Tạo tài khoản thành công", description: `${ROLE_LABELS[createForm.roleId]} · ${createForm.name}` });
      setEditingId(null);
      setFormOpen(false);
      await load();
    } catch (err) {
      toast({ title: editingId ? "Cập nhật nhân viên thất bại" : "Tạo tài khoản thất bại", description: err instanceof Error ? err.message : "Không thể lưu tài khoản.", variant: "destructive" });
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleActive = async (staff: StaffUser) => {
    try {
      const updated = await apiPatch<StaffUser>(`/users/${staff.userId}/active`, { active: !staff.active });
      setUsers((current) => current.map((item) => item.userId === updated.userId ? updated : item));
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
  if (error) return <ErrorState message={error} />;

  const byRole: Record<string, StaffUser[]> = {};
  users.forEach((u) => { (byRole[u.roleId] = byRole[u.roleId] || []).push(u); });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý nhân sự"
        description="Danh sách nhân viên theo vai trò nghiệp vụ"
        icon={<Users className="h-5 w-5" />}
        actions={<Button onClick={startCreate} className="gap-2"><UserPlus className="h-4 w-4" /> Tạo nhân viên</Button>}
      />

      {formOpen && (
        <Card className="border-primary/30 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">{editingId ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {editingId ? "Cập nhật tài khoản nhân viên" : "Tạo tài khoản nhân viên nội bộ"}</span>
              <button onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Họ và tên *</Label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nguyễn Văn B" required />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@example.com" required />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Số điện thoại *</Label>
                  <Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="0901234567" required />
                </div>
                <div className="space-y-2">
                  <Label>Vai trò nội bộ *</Label>
                  <select value={createForm.roleId} onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {STAFF_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tổ chức (tùy chọn)</Label>
                <Input maxLength={150} value={createForm.organizationName} onChange={(e) => setCreateForm({ ...createForm, organizationName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu {editingId ? "(để trống để giữ nguyên)" : "*"}</Label>
                <Input type="password" minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required={!editingId} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={createLoading} className="gap-2">
                  {createLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang lưu...</> : <><UserPlus className="h-4 w-4" /> {editingId ? "Lưu thay đổi" : "Tạo tài khoản"}</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {Object.entries(byRole).map(([roleId, list]) => (
        <Card key={roleId}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge variant="outline" className="bg-primary/5">{ROLE_LABELS[roleId]}</Badge>
              <span className="text-sm text-muted-foreground">{list.length} người</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((u) => (
                <div key={u.userId} className={`rounded-lg border border-border p-4 ${u.active ? "" : "opacity-60"}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {u.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.roleId]}</p>
                    </div>
                    <Badge variant={u.active ? "default" : "secondary"} className="ml-auto">{u.active ? "Đang hoạt động" : "Đã vô hiệu hóa"}</Badge>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> <span className="truncate">{u.email}</span></p>
                    {u.phoneNumber && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {u.phoneNumber}</p>}
                    {u.organizationName && <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> {u.organizationName}</p>}
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(u)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Sửa</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={u.userId === user?.userId}
                      onClick={() => void toggleActive(u)}
                      className="gap-1"
                    >
                      {u.active ? <UserRoundX className="h-3.5 w-3.5" /> : <UserRoundCheck className="h-3.5 w-3.5" />}
                      {u.active ? "Vô hiệu hóa" : "Kích hoạt"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
