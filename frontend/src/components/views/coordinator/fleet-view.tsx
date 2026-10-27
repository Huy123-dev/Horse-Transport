"use client";

import { useCallback, useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { LoadingState, ErrorState, EmptyState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PackageCheck, Truck, Plane, Container, Pencil, Plus, Trash2, X, type LucideIcon } from "lucide-react";
import { assetStatusLabel } from "@/lib/constants";

interface TransportAsset {
  assetId: string;
  name: string;
  type: string;
  capacity: number;
  ownerPartnerId: string | null;
  ownerPartnerName: string | null;
  status: string;
}

interface AssetDraft {
  name: string;
  type: string;
  capacity: string;
  ownerPartnerId: string;
  status: string;
}

const emptyDraft: AssetDraft = {
  name: "",
  type: "TRUCK",
  capacity: "1",
  ownerPartnerId: "",
  status: "AVAILABLE",
};

const ASSET_ICONS: Record<string, LucideIcon> = {
  TRUCK: Truck,
  AIR_CONTAINER: Container,
  FLIGHT_SLOT: Plane,
};

export function FleetView() {
  const { toast } = useToast();
  const [assets, setAssets] = useState<TransportAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<AssetDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAssets = useCallback(() => apiGet<TransportAsset[]>("/transport-assets"), []);

  const load = useCallback(async () => {
    try {
      const loadedAssets = await fetchAssets();
      setAssets(loadedAssets);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải danh sách phương tiện.");
    } finally {
      setLoading(false);
    }
  }, [fetchAssets]);

  useEffect(() => {
    let active = true;
    fetchAssets()
      .then((loadedAssets) => {
        if (active) {
          setAssets(loadedAssets);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Không thể tải danh sách phương tiện.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchAssets]);

  const startCreate = () => {
    setEditingId(null);
    setDraft({ ...emptyDraft });
  };

  const startEdit = (asset: TransportAsset) => {
    setEditingId(asset.assetId);
    setDraft({
      name: asset.name,
      type: asset.type,
      capacity: String(asset.capacity),
      ownerPartnerId: asset.ownerPartnerId ?? "",
      status: apiAssetStatus(asset.status),
    });
  };

  const saveAsset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        type: draft.type.trim().toUpperCase(),
        capacity: Number(draft.capacity),
        ownerPartnerId: draft.ownerPartnerId.trim() || null,
        status: draft.status,
      };
      if (!payload.name || !payload.type || !Number.isInteger(payload.capacity) || payload.capacity < 1) {
        throw new Error("Tên, loại và sức chứa phải hợp lệ; sức chứa tối thiểu là 1 ngựa.");
      }
      if (editingId) {
        await apiPut(`/transport-assets/${editingId}`, payload);
      } else {
        await apiPost("/transport-assets", payload);
      }
      toast({ title: editingId ? "Đã cập nhật phương tiện" : "Đã thêm phương tiện" });
      setDraft(null);
      setEditingId(null);
      await load();
    } catch (cause) {
      toast({
        title: "Không thể lưu phương tiện",
        description: cause instanceof Error ? cause.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async (asset: TransportAsset) => {
    if (!window.confirm(`Xóa phương tiện "${asset.name}"? Phương tiện đang được phân công không thể xóa.`)) return;
    try {
      await apiDelete(`/transport-assets/${asset.assetId}`);
      toast({ title: "Đã xóa phương tiện" });
      await load();
    } catch (cause) {
      toast({
        title: "Không thể xóa phương tiện",
        description: cause instanceof Error ? cause.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đội xe & Phương tiện"
        description="Quản lý phương tiện vận chuyển chuyên dụng"
        icon={<PackageCheck className="h-5 w-5" />}
        actions={<Button onClick={startCreate} className="gap-2"><Plus className="h-4 w-4" /> Thêm phương tiện</Button>}
      />

      {draft && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {editingId ? "Cập nhật phương tiện" : "Thêm phương tiện"}
              <Button type="button" size="icon" variant="ghost" onClick={() => setDraft(null)} aria-label="Đóng biểu mẫu">
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void saveAsset(event)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="asset-name">Tên phương tiện *</Label>
                  <Input id="asset-name" required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset-type">Loại phương tiện *</Label>
                  <Input id="asset-type" required maxLength={50} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })} placeholder="TRUCK" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset-capacity">Sức chứa (ngựa) *</Label>
                  <Input id="asset-capacity" required type="number" min={1} step={1} value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset-partner">Mã đối tác sở hữu (tùy chọn)</Label>
                  <Input id="asset-partner" value={draft.ownerPartnerId} onChange={(event) => setDraft({ ...draft, ownerPartnerId: event.target.value })} placeholder="UUID đối tác" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="asset-status">Trạng thái *</Label>
                  <select id="asset-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="AVAILABLE">Sẵn sàng</option>
                    <option value="IN_USE">Đang vận hành</option>
                    <option value="MAINTENANCE">Bảo trì</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDraft(null)}>Hủy</Button>
                <Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu phương tiện"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {assets.length === 0 ? (
        <EmptyState icon={<PackageCheck className="h-6 w-6" />} title="Chưa có phương tiện" description="Thêm phương tiện để bắt đầu quản lý đội xe." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => {
            const Icon = ASSET_ICONS[asset.type] || Truck;
            return (
              <Card key={asset.assetId} className="transition-all hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div>
                    <StatusBadge status={assetStatusLabel(asset.status)} />
                  </div>
                  <h3 className="mt-3 text-base font-bold tracking-tight">{asset.name}</h3>
                  <p className="text-xs text-muted-foreground">{asset.type.replace(/_/g, " ")}</p>
                  <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Sức chứa</span><span className="font-medium">{asset.capacity} ngựa</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Đối tác</span><span className="font-medium">{asset.ownerPartnerName || "—"}</span></div>
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(asset)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Sửa</Button>
                    <Button variant="destructive" size="sm" onClick={() => void deleteAsset(asset)} className="gap-1"><Trash2 className="h-3.5 w-3.5" /> Xóa</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function apiAssetStatus(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "san sang su dung" || normalized === "available") return "AVAILABLE";
  if (normalized === "dang van hanh" || normalized === "in_use") return "IN_USE";
  if (normalized === "bao tri" || normalized === "maintenance") return "MAINTENANCE";
  return status;
}
