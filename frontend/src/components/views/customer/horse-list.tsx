"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useAppStore } from "@/store/app-store";
import { apiGet, apiPost, apiPut, apiDelete, uploadHorseImage } from "@/lib/api-client";
import { PageHeader } from "@/components/app/page-header";
import { HorseImage } from "@/components/app/horse-image";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Heart,
  Microchip,
  Pencil,
  Plus,
  Search,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";


export interface HorseProfile {
  id: string;
  microchipId: string;
  name: string;
  gender: string;
  breed?: string | null;
  pedigree?: string | null;
  medicalHistory?: string | null;
  allergies?: string | null;
  temperament?: string | null;
  imageUrl?: string | null;
  birthYear?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  recoveryDays?: number | null;
}

export type HorseProfileInput = Omit<HorseProfile, "id">;

interface HorseApiResponse {
  horseId: string;
  microchipId: string;
  name: string;
  gender: string;
  pedigree: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  temperament: string | null;
  imageUrl?: string | null;
  breed?: string | null;
  birthYear?: number | null;
  weightKg?: number | null;
  heightCm?: number | null;
  recoveryDays?: number | null;
}

export function HorseList() {
  const { navigate, user } = useAppStore();
  const [horses, setHorses] = useState<HorseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState<HorseProfile | null>(null);
  const [horseToDelete, setHorseToDelete] = useState<HorseProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<HorseProfileInput>(emptyHorseForm());
  const imageForm = useForm<{ imageUrl: string | null }>({ defaultValues: { imageUrl: null } });
  const imageUrl = useWatch({ control: imageForm.control, name: "imageUrl" });
  const { toast } = useToast();


  const fetchHorses = useCallback(async () => {
    try {
      setLoading(true);

      const data = await apiGet<HorseApiResponse[]>("/horses/my-horses");
      setHorses(data.map(({ horseId, ...horse }) => ({ ...horse, id: horseId })));
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể tải hồ sơ ngựa từ máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchHorses);
  }, [fetchHorses]);

  function openCreateDialog() {
    setEditingHorse(null);
    setForm(emptyHorseForm());
    imageForm.reset({ imageUrl: null });
    setUploadedImageName("");
    setFormError("");
    setEditorOpen(true);
  }

  function openEditDialog(horse: HorseProfile) {
    setEditingHorse(horse);
    setForm({
      microchipId: horse.microchipId,
      name: horse.name,
      gender: horse.gender,
      breed: horse.breed ?? "",
      pedigree: horse.pedigree ?? "",
      medicalHistory: horse.medicalHistory ?? "",
      allergies: horse.allergies ?? "",
      temperament: horse.temperament ?? "",
      imageUrl: horse.imageUrl ?? null,
      birthYear: horse.birthYear ?? null,
      weightKg: horse.weightKg ?? null,
      heightCm: horse.heightCm ?? null,
      recoveryDays: horse.recoveryDays ?? null,
    });
    imageForm.reset({ imageUrl: horse.imageUrl ?? null });
    setUploadedImageName(horse.imageUrl?.split("/").at(-1) ?? "");
    setFormError("");
    setEditorOpen(true);
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormError("Ảnh phải có định dạng JPG, PNG hoặc WebP.");
      input.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError("Ảnh không được vượt quá 10MB.");
      input.value = "";
      return;
    }

    setUploadingImage(true);
    setFormError("");
    try {
      const uploadedUrl = await uploadHorseImage(file);
      imageForm.setValue("imageUrl", uploadedUrl, { shouldDirty: true });
      setUploadedImageName(`${file.name} · ${formatFileSize(file.size)}`);
      toast({ title: "Đã tải ảnh", description: "Ảnh ngựa đã được tải lên thành công." });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Không thể tải ảnh lên.");
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const microchipId = form.microchipId.trim();
    if (!name || !microchipId || !form.gender.trim()) {
      setFormError("Vui lòng nhập họ tên, mã microchip và giới tính.");
      return;
    }

    const payload = {
      name,
      microchipId,
      gender: form.gender.trim(),
      breed: optionalText(form.breed),
      birthYear: form.birthYear != null && form.birthYear !== ("" as unknown as number) ? Number(form.birthYear) : null,
      weightKg: form.weightKg != null && form.weightKg !== ("" as unknown as number) ? Number(form.weightKg) : null,
      heightCm: form.heightCm != null && form.heightCm !== ("" as unknown as number) ? Number(form.heightCm) : null,
      recoveryDays: form.recoveryDays != null && form.recoveryDays !== ("" as unknown as number) ? Number(form.recoveryDays) : null,
      pedigree: optionalText(form.pedigree),
      medicalHistory: optionalText(form.medicalHistory),
      allergies: optionalText(form.allergies),
      temperament: optionalText(form.temperament),
      imageUrl: imageForm.getValues("imageUrl"),
    };

    setSaving(true);
    try {
      if (editingHorse?.id) {

        await apiPut(`/api/horses/${editingHorse.id}`, payload);
        toast({ title: "Đã cập nhật", description: "Hồ sơ ngựa đã được cập nhật thành công." });
      } else {

        await apiPost("/api/horses", payload);
        toast({ title: "Đã thêm mới", description: "Hồ sơ ngựa đã được lưu vào hệ thống." });
      }
      setEditorOpen(false);
      fetchHorses();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu thông tin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!horseToDelete?.id) return;
    try {

      await apiDelete(`/api/horses/${horseToDelete.id}`);
      toast({ title: "Đã xóa", description: "Hồ sơ ngựa đã được xóa khỏi hệ thống." });
      fetchHorses();
    } catch (err: unknown) {
      toast({
        title: "Không thể xóa",
        description: err instanceof Error ? err.message : "Đã xảy ra lỗi khi xóa hồ sơ.",
        variant: "destructive",
      });
    } finally {
      setHorseToDelete(null);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const filtered = horses.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()) ||
    h.microchipId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Hồ sơ ngựa" description="Danh sách ngựa đua đã đăng ký" icon={<Heart className="h-5 w-5" />}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Tìm kiếm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm" className="pl-9" />
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" /> Thêm hồ sơ ngựa
            </Button>
          </div>
        }
      />

      {filtered.length === 0 ? (
        <EmptyState illustration="no-data" title={search ? "Không tìm thấy hồ sơ ngựa" : "Chưa có ngựa nào"} description={search ? "Thử tìm theo tên hoặc mã microchip khác." : "Thêm hồ sơ ngựa để bắt đầu quản lý thông tin."} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((h) => (
            <Card key={h.id} className="h-full transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex h-full flex-col p-5">
                <button
                  type="button"
                  onClick={() => navigate("horse-detail", { id: h.id })}
                  className="flex flex-1 flex-col text-left"
                  aria-label={`Xem hồ sơ ngựa ${h.name}`}
                >
                  <div className="flex w-full items-start justify-between gap-3">
                    <HorseImage src={h.imageUrl} name={h.name} className="h-16 w-16 rounded-xl" />
                    <StatusBadge status={h.gender} />
                  </div>
                  <h3 className="mt-3 text-lg font-bold tracking-tight">{h.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>Giống: {h.breed?.trim() ? h.breed : "Chưa cập nhật"}</span>
                    <span>·</span>
                    <span>Năm sinh: {h.birthYear != null ? h.birthYear : "Chưa cập nhật"}</span>
                    <span>·</span>
                    <span>Cân nặng: {h.weightKg != null ? `${h.weightKg} kg` : "Chưa cập nhật"}</span>
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-2"><Microchip className="h-3.5 w-3.5" /> {h.microchipId}</p>
                  </div>
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs"><span className="text-muted-foreground">Tính khí:</span> <span className="font-medium">{h.temperament || "—"}</span></p>
                  </div>
                </button>
                <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(h)} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                  {user?.roleId === "LOGISTICS_MANAGER" && (
                    <Button variant="outline" size="sm" onClick={() => setHorseToDelete(h)} className="gap-1.5 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Xóa
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingHorse ? "Sửa hồ sơ ngựa" : "Thêm hồ sơ ngựa"}</DialogTitle>
            <DialogDescription>
              Thông tin sẽ được cập nhật trực tiếp vào cơ sở dữ liệu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <input type="hidden" {...imageForm.register("imageUrl")} />
            <FormField label="Ảnh ngựa">
              <div className="flex flex-wrap items-center gap-4">
                <HorseImage src={imageUrl} name={form.name || "đang chọn"} className="h-24 w-24 rounded-md" />
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => void handleImageSelected(event)}
                    disabled={uploadingImage || saving}
                    aria-label="Chọn ảnh ngựa"
                  />
                  <p className="text-xs text-muted-foreground">Chọn ảnh tối đa 10MB.</p>
                  {uploadedImageName && <p className="max-w-64 break-all text-xs text-muted-foreground">{uploadedImageName}</p>}
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        imageForm.setValue("imageUrl", null, { shouldDirty: true });
                        setUploadedImageName("");
                      }}
                      disabled={uploadingImage || saving}
                    >
                      Xóa ảnh
                    </Button>
                  )}
                </div>
              </div>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Tên ngựa *">
                <Input value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
              </FormField>
              <FormField label="Mã microchip *">
                <Input value={form.microchipId} onChange={(event) => updateForm("microchipId", event.target.value)} required />
              </FormField>
              <FormField label="Giới tính *">
                <select
                  value={form.gender}
                  onChange={(event) => updateForm("gender", event.target.value)}
                  required
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="Đực">Đực</option>
                  <option value="Cái">Cái</option>
                  <option value="Thiến">Thiến</option>
                </select>
              </FormField>
              <FormField label="Giống ngựa">
                <Input
                  list="horse-breed-options"
                  placeholder="Chọn hoặc nhập giống ngựa..."
                  value={form.breed ?? ""}
                  onChange={(event) => updateForm("breed", event.target.value)}
                />
                <datalist id="horse-breed-options">
                  <option value="Thoroughbred" />
                  <option value="Arabian" />
                  <option value="Quarter Horse" />
                  <option value="Standardbred" />
                  <option value="Warmblood" />
                  <option value="Ngựa thể thao lai" />
                </datalist>
              </FormField>
              <FormField label="Năm sinh">
                <Input
                  type="number"
                  min={1990}
                  max={new Date().getFullYear()}
                  placeholder="VD: 2019"
                  value={form.birthYear ?? ""}
                  onChange={(event) => updateForm("birthYear", event.target.value ? Number(event.target.value) : null)}
                />
              </FormField>
              <FormField label="Cân nặng (kg)">
                <Input
                  type="number"
                  step="0.1"
                  min={1}
                  max={2000}
                  placeholder="VD: 520"
                  value={form.weightKg ?? ""}
                  onChange={(event) => updateForm("weightKg", event.target.value ? Number(event.target.value) : null)}
                />
              </FormField>
              <FormField label="Chiều cao (cm)">
                <Input
                  type="number"
                  step="0.1"
                  min={1}
                  max={300}
                  placeholder="VD: 165"
                  value={form.heightCm ?? ""}
                  onChange={(event) => updateForm("heightCm", event.target.value ? Number(event.target.value) : null)}
                />
              </FormField>
              <FormField label="Thời gian hồi phục (ngày)">
                <Input
                  type="number"
                  min={0}
                  max={365}
                  placeholder="VD: 7"
                  value={form.recoveryDays ?? ""}
                  onChange={(event) => updateForm("recoveryDays", event.target.value ? Number(event.target.value) : null)}
                />
              </FormField>
              <FormField label="Tính khí">
                <Input value={form.temperament ?? ""} onChange={(event) => updateForm("temperament", event.target.value)} />
              </FormField>
              <FormField label="Phả hệ">
                <Input value={form.pedigree ?? ""} onChange={(event) => updateForm("pedigree", event.target.value)} />
              </FormField>
              <FormField label="Tiền sử bệnh">
                <Input value={form.medicalHistory ?? ""} onChange={(event) => updateForm("medicalHistory", event.target.value)} />
              </FormField>
              <FormField label="Dị ứng">
                <Input value={form.allergies ?? ""} onChange={(event) => updateForm("allergies", event.target.value)} />
              </FormField>
            </div>
            {formError && (
              <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> {formError}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>Hủy</Button>
              <Button type="submit" disabled={saving || uploadingImage}>
                {uploadingImage ? "Đang tải ảnh..." : saving ? "Đang lưu..." : "Lưu hồ sơ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!horseToDelete} onOpenChange={(open) => { if (!open) setHorseToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hồ sơ ngựa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hồ sơ “{horseToDelete?.name}” sẽ bị xóa vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa hồ sơ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  function updateForm<K extends keyof HorseProfileInput>(key: K, value: HorseProfileInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

}

function emptyHorseForm(): HorseProfileInput {
  return {
    microchipId: "",
    name: "",
    gender: "",
    breed: "",
    pedigree: "",
    medicalHistory: "",
    allergies: "",
    temperament: "",
    birthYear: null,
    weightKg: null,
    heightCm: null,
    recoveryDays: null,
  };
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatFileSize(size: number): string {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex flex-col items-start gap-2">
        {label}
        {children}
      </Label>
    </div>
  );
}