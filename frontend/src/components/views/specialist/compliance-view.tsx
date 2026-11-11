"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Calendar,
  Building2,
  FileText,
  Search,
  Filter,
  Trash2,
  Edit,
  ExternalLink,
  Clock,
  ArrowRight,
  Globe2,
} from "lucide-react";
import { formatDate, requestCode } from "@/lib/constants";

export interface QuarantineReservation {
  reservationId: string;
  requestId: string;
  facilityLocationId: string;
  facilityName: string;
  startDate: string;
  endDate: string;
  horseCount: number;
  status: string;
}

export interface CustomsRegulation {
  regulationId: string;
  countryCode: string;
  portLocationId: string | null;
  portLocationName: string | null;
  quarantineStandard: string;
  requiredDocuments: string;
  importExportType: "IMPORT" | "EXPORT" | string;
}

export interface TransportRequestSummary {
  requestId: string;
  competitionName?: string;
  status: string;
  horseCount?: number;
  origin?: { name: string };
  destination?: { name: string };
}

export interface LocationItem {
  locationId: string;
  name: string;
  type: string;
  countryCode?: string;
}

export function ComplianceView() {
  const { navigate, user } = useAppStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"reservations" | "regulations" | "checks">("reservations");

  // Tab 1: Reservations
  const [reservations, setReservations] = useState<QuarantineReservation[]>([]);
  const [resStatusFilter, setResStatusFilter] = useState("");
  const [resLoading, setResLoading] = useState(false);
  const [createResOpen, setCreateResOpen] = useState(false);
  const [submittingRes, setSubmittingRes] = useState(false);

  // Tab 2: Customs Regulations
  const [regulations, setRegulations] = useState<CustomsRegulation[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<CustomsRegulation | null>(null);
  const [submittingReg, setSubmittingReg] = useState(false);

  // Tab 3: Request Compliance Checks
  const [requests, setRequests] = useState<TransportRequestSummary[]>([]);
  const [complianceMap, setComplianceMap] = useState<Record<string, any>>({});
  const [checksLoading, setChecksLoading] = useState(false);

  // Shared auxiliary data
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [availableRequests, setAvailableRequests] = useState<TransportRequestSummary[]>([]);

  // Reservation form state
  const [resForm, setResForm] = useState({
    requestId: "",
    facilityLocationId: "",
    startDate: "",
    endDate: "",
  });

  // Regulation form state
  const [regForm, setRegForm] = useState({
    countryCode: "VNM",
    portLocationId: "",
    quarantineStandard: "",
    requiredDocuments: "",
    importExportType: "IMPORT",
  });

  const isManagerOrSpecialist = ["LOGISTICS_MANAGER", "TRANSPORT_SPECIALIST"].includes(
    user?.roleId || ""
  );

  // Load common data: locations and requests
  useEffect(() => {
    (async () => {
      try {
        const [locs, reqsData] = await Promise.all([
          apiGet<LocationItem[]>("/locations").catch(() => []),
          apiGet<{ requests: TransportRequestSummary[] }>("/transport-requests").catch(() => ({
            requests: [],
          })),
        ]);
        setLocations(locs || []);
        const active = (reqsData.requests || []).filter((r) =>
          ["Đã phê duyệt", "Đang thẩm định", "Đã gửi", "APPROVED", "PENDING_APPROVAL"].includes(
            r.status
          )
        );
        setAvailableRequests(active);
        setRequests(active);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Fetch Reservations
  const fetchReservations = useCallback(async () => {
    try {
      setResLoading(true);
      const url = resStatusFilter
        ? `/quarantine-reservations?status=${resStatusFilter}`
        : "/quarantine-reservations";
      const data = await apiGet<QuarantineReservation[]>(url);
      setReservations(data || []);
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể tải danh sách kiểm dịch",
        variant: "destructive",
      });
    } finally {
      setResLoading(false);
    }
  }, [resStatusFilter, toast]);

  // Fetch Customs Regulations
  const fetchRegulations = useCallback(async () => {
    try {
      setRegLoading(true);
      const url = countryFilter
        ? `/customs-regulations?countryCode=${countryFilter.toUpperCase()}`
        : "/customs-regulations";
      const data = await apiGet<CustomsRegulation[]>(url);
      setRegulations(data || []);
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể tải quy định hải quan",
        variant: "destructive",
      });
    } finally {
      setRegLoading(false);
    }
  }, [countryFilter, toast]);

  // Fetch Checks
  const fetchChecks = useCallback(async () => {
    if (requests.length === 0) return;
    try {
      setChecksLoading(true);
      const compResults = await Promise.all(
        requests.map((r) =>
          apiGet(`/transport-requests/${r.requestId}/compliance`).catch(() => null)
        )
      );
      const map: Record<string, any> = {};
      requests.forEach((r, i) => {
        if (compResults[i]) map[r.requestId] = compResults[i];
      });
      setComplianceMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setChecksLoading(false);
    }
  }, [requests]);

  useEffect(() => {
    if (activeTab === "reservations") fetchReservations();
    else if (activeTab === "regulations") fetchRegulations();
    else if (activeTab === "checks") fetchChecks();
  }, [activeTab, fetchReservations, fetchRegulations, fetchChecks]);

  // Create Reservation
  const handleCreateReservation = async () => {
    if (!resForm.requestId || !resForm.facilityLocationId || !resForm.startDate || !resForm.endDate) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập đầy đủ các trường bắt buộc", variant: "destructive" });
      return;
    }
    if (resForm.startDate > resForm.endDate) {
      toast({ title: "Lỗi ngày tháng", description: "Ngày bắt đầu phải trước ngày kết thúc", variant: "destructive" });
      return;
    }
    try {
      setSubmittingRes(true);
      await apiPost("/quarantine-reservations", {
        requestId: resForm.requestId,
        facilityLocationId: resForm.facilityLocationId,
        startDate: resForm.startDate,
        endDate: resForm.endDate,
      });
      toast({ title: "Thành công", description: "Đã tạo lịch kiểm dịch mới" });
      setCreateResOpen(false);
      setResForm({ requestId: "", facilityLocationId: "", startDate: "", endDate: "" });
      fetchReservations();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể tạo lịch kiểm dịch",
        variant: "destructive",
      });
    } finally {
      setSubmittingRes(false);
    }
  };

  // Update Reservation Status
  const handleUpdateReservationStatus = async (id: string, newStatus: string) => {
    try {
      await apiPatch(`/quarantine-reservations/${id}/status`, { status: newStatus });
      toast({ title: "Thành công", description: `Đã cập nhật trạng thái: ${newStatus}` });
      fetchReservations();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể cập nhật trạng thái",
        variant: "destructive",
      });
    }
  };

  // Delete Reservation
  const handleDeleteReservation = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy / xóa lịch đặt chỗ này?")) return;
    try {
      await apiDelete(`/quarantine-reservations/${id}`);
      toast({ title: "Thành công", description: "Đã xóa lịch đặt chỗ kiểm dịch" });
      fetchReservations();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể xóa lịch kiểm dịch",
        variant: "destructive",
      });
    }
  };

  // Save Regulation (Create or Update)
  const handleSaveRegulation = async () => {
    if (!regForm.countryCode || !regForm.importExportType) {
      toast({ title: "Thiếu thông tin", description: "Vui lòng nhập mã quốc gia và loại quy định", variant: "destructive" });
      return;
    }
    try {
      setSubmittingReg(true);
      const payload = {
        countryCode: regForm.countryCode.toUpperCase().trim(),
        portLocationId: regForm.portLocationId || null,
        quarantineStandard: regForm.quarantineStandard,
        requiredDocuments: regForm.requiredDocuments,
        importExportType: regForm.importExportType,
      };

      if (editingReg) {
        await apiPut(`/customs-regulations/${editingReg.regulationId}`, payload);
        toast({ title: "Thành công", description: "Đã cập nhật quy định hải quan" });
      } else {
        await apiPost("/customs-regulations", payload);
        toast({ title: "Thành công", description: "Đã thêm mới quy định hải quan" });
      }
      setRegModalOpen(false);
      setEditingReg(null);
      fetchRegulations();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể lưu quy định hải quan",
        variant: "destructive",
      });
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleDeleteRegulation = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa quy định hải quan này?")) return;
    try {
      await apiDelete(`/customs-regulations/${id}`);
      toast({ title: "Thành công", description: "Đã xóa quy định hải quan" });
      fetchRegulations();
    } catch (err: unknown) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Không thể xóa quy định",
        variant: "destructive",
      });
    }
  };

  const openEditRegulation = (reg: CustomsRegulation) => {
    setEditingReg(reg);
    setRegForm({
      countryCode: reg.countryCode,
      portLocationId: reg.portLocationId || "",
      quarantineStandard: reg.quarantineStandard || "",
      requiredDocuments: reg.requiredDocuments || "",
      importExportType: reg.importExportType || "IMPORT",
    });
    setRegModalOpen(true);
  };

  const openNewRegulation = () => {
    setEditingReg(null);
    setRegForm({
      countryCode: "VNM",
      portLocationId: "",
      quarantineStandard: "",
      requiredDocuments: "",
      importExportType: "IMPORT",
    });
    setRegModalOpen(true);
  };

  const getStatusBadgeVariant = (st: string) => {
    switch (st) {
      case "CONFIRMED":
        return "border-emerald-500/40 bg-emerald-950/40 text-emerald-300";
      case "IN_QUARANTINE":
        return "border-cyan-500/40 bg-cyan-950/40 text-cyan-300";
      case "COMPLETED":
        return "border-primary/40 bg-primary/10 text-primary";
      case "CANCELLED":
        return "border-rose-500/40 bg-rose-950/40 text-rose-300";
      case "PENDING":
      default:
        return "border-amber-500/40 bg-amber-950/40 text-amber-300";
    }
  };

  const getStatusLabel = (st: string) => {
    switch (st) {
      case "PENDING":
        return "Chờ xác nhận";
      case "CONFIRMED":
        return "Đã giữ chỗ";
      case "IN_QUARANTINE":
        return "Đang cách ly";
      case "COMPLETED":
        return "Đã hoàn thành";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return st;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm dịch & Thông quan"
        description="Quản lý lịch đặt chỗ cơ sở kiểm dịch, danh mục quy định hải quan quốc tế và thẩm định hồ sơ vận chuyển"
        icon={<ShieldCheck className="h-5 w-5" />}
      />

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("reservations")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "reservations"
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Đặt chỗ kiểm dịch ({reservations.length})
        </button>

        <button
          onClick={() => setActiveTab("regulations")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "regulations"
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <Globe2 className="h-4 w-4" />
          Quy định hải quan ({regulations.length})
        </button>

        <button
          onClick={() => setActiveTab("checks")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "checks"
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Thẩm định hồ sơ ({requests.length})
        </button>
      </div>

      {/* ==================== TAB 1: RESERVATIONS ==================== */}
      {activeTab === "reservations" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Lọc trạng thái:</span>
              <select
                value={resStatusFilter}
                onChange={(e) => setResStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ xác nhận (PENDING)</option>
                <option value="CONFIRMED">Đã giữ chỗ (CONFIRMED)</option>
                <option value="IN_QUARANTINE">Đang cách ly (IN_QUARANTINE)</option>
                <option value="COMPLETED">Đã hoàn thành (COMPLETED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </select>
            </div>

            {isManagerOrSpecialist && (
              <Button
                onClick={() => setCreateResOpen(true)}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Đặt chỗ kiểm dịch mới
              </Button>
            )}
          </div>

          {resLoading ? (
            <LoadingState />
          ) : reservations.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="Chưa có lịch đặt chỗ kiểm dịch"
              description="Hiện tại chưa có đặt chỗ cơ sở kiểm dịch nào được ghi nhận."
              action={
                isManagerOrSpecialist ? (
                  <Button size="sm" onClick={() => setCreateResOpen(true)}>
                    Tạo đặt chỗ đầu tiên
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reservations.map((res) => (
                <Card key={res.reservationId} className="border-border bg-card">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            {res.facilityName || "Trạm kiểm dịch"}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground">
                            Đơn: {requestCode(res.requestId)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeVariant(
                          res.status
                        )}`}
                      >
                        {getStatusLabel(res.status)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2.5">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Bắt đầu cách ly</p>
                        <p className="font-medium text-foreground">{formatDate(res.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Kết thúc cách ly</p>
                        <p className="font-medium text-foreground">{formatDate(res.endDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-2 text-muted-foreground">
                      <span>Số ngựa cách ly:</span>
                      <span className="font-bold text-foreground">{res.horseCount || 1} con</span>
                    </div>

                    {isManagerOrSpecialist && (
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
                        {res.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] border-emerald-500/40 text-emerald-400 hover:bg-emerald-950/30"
                              onClick={() =>
                                handleUpdateReservationStatus(res.reservationId, "CONFIRMED")
                              }
                            >
                              Xác nhận chỗ
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] border-rose-500/40 text-rose-400 hover:bg-rose-950/30"
                              onClick={() =>
                                handleUpdateReservationStatus(res.reservationId, "CANCELLED")
                              }
                            >
                              Hủy
                            </Button>
                          </>
                        )}

                        {res.status === "CONFIRMED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/30"
                            onClick={() =>
                              handleUpdateReservationStatus(res.reservationId, "IN_QUARANTINE")
                            }
                          >
                            Vào cách ly
                          </Button>
                        )}

                        {res.status === "IN_QUARANTINE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] border-primary/40 text-primary hover:bg-primary/20"
                            onClick={() =>
                              handleUpdateReservationStatus(res.reservationId, "COMPLETED")
                            }
                          >
                            Hoàn tất kiểm dịch
                          </Button>
                        )}

                        <div className="ml-auto">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-400 hover:bg-rose-950/30"
                            title="Xóa đặt chỗ"
                            onClick={() => handleDeleteReservation(res.reservationId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 2: CUSTOMS REGULATIONS ==================== */}
      {activeTab === "regulations" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Lọc mã quốc gia (VNM, JPN, AUS, USA...)"
                  value={countryFilter}
                  onChange={(e) => setCountryFilter(e.target.value)}
                  className="h-8 w-64 pl-8 text-xs uppercase"
                />
              </div>
              {countryFilter && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setCountryFilter("")}
                >
                  Xóa lọc
                </Button>
              )}
            </div>

            {isManagerOrSpecialist && (
              <Button
                onClick={openNewRegulation}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Plus className="h-4 w-4" /> Thêm quy định hải quan
              </Button>
            )}
          </div>

          {regLoading ? (
            <LoadingState />
          ) : regulations.length === 0 ? (
            <EmptyState
              icon={<Globe2 className="h-8 w-8" />}
              title="Chưa có quy định hải quan nào"
              description={
                countryFilter
                  ? `Không tìm thấy quy định cho quốc gia ${countryFilter.toUpperCase()}`
                  : "Chưa có quy định hải quan nào trong hệ thống."
              }
              action={
                isManagerOrSpecialist ? (
                  <Button size="sm" onClick={openNewRegulation}>
                    Thêm quy định đầu tiên
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {regulations.map((reg) => (
                <Card key={reg.regulationId} className="border-border bg-card flex flex-col">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
                          {reg.countryCode}
                        </div>
                        <div>
                          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                            Quốc gia: {reg.countryCode}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground">
                            Cửa khẩu: {reg.portLocationName || "Toàn quốc / Mặc định"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                          reg.importExportType === "IMPORT"
                            ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                            : "border-sky-500/40 bg-sky-950/40 text-sky-300"
                        }`}
                      >
                        {reg.importExportType === "IMPORT" ? "NHẬP KHẨU" : "XUẤT KHẨU"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 p-4 pt-2 text-xs flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Tiêu chuẩn kiểm dịch:
                        </p>
                        <p className="mt-0.5 text-foreground leading-relaxed">
                          {reg.quarantineStandard || "Không yêu cầu tiêu chuẩn đặc biệt."}
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-2.5">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Hồ sơ & Giấy tờ bắt buộc:
                        </p>
                        <p className="mt-0.5 text-foreground leading-relaxed">
                          {reg.requiredDocuments || "Hộ chiếu FEI, Giấy kiểm dịch hợp lệ."}
                        </p>
                      </div>
                    </div>

                    {isManagerOrSpecialist && (
                      <div className="flex items-center justify-end gap-2 border-t border-border pt-3 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => openEditRegulation(reg)}
                        >
                          <Edit className="h-3 w-3" /> Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-rose-400 hover:bg-rose-950/30 gap-1"
                          onClick={() => handleDeleteRegulation(reg.regulationId)}
                        >
                          <Trash2 className="h-3 w-3" /> Xóa
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: COMPLIANCE CHECKS ==================== */}
      {activeTab === "checks" && (
        <div className="space-y-4">
          {checksLoading ? (
            <LoadingState />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-8 w-8" />}
              title="Không có đơn vận chuyển cần thẩm định"
              description="Hiện tại không có đơn hàng nào đang trong quá trình xét duyệt hồ sơ."
            />
          ) : (
            <div className="space-y-4">
              {requests.map((r) => {
                const comp = complianceMap[r.requestId];
                return (
                  <Card key={r.requestId} className="border-border bg-card">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FlaskConical className="h-5 w-5" />
                          </div>
                          <div>
                            <button
                              onClick={() => navigate("inspection-detail", { id: r.requestId })}
                              className="text-left"
                            >
                              <p className="text-sm font-semibold hover:underline">
                                {r.competitionName || `Đơn ${requestCode(r.requestId)}`}
                              </p>
                            </button>
                            <p className="text-xs text-muted-foreground">
                              {r.origin?.name || "Điểm đi"} → {r.destination?.name || "Điểm đến"}
                            </p>
                          </div>
                        </div>
                        {comp && (
                          <StatusBadge
                            status={comp.allPassed ? "Sẵn sàng thông quan" : "Chưa đạt tiêu chuẩn"}
                          />
                        )}
                      </div>

                      {comp && comp.checks && (
                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                          {comp.checks.map((c: any) => (
                            <div
                              key={c.key}
                              className="flex items-center gap-2 rounded-lg border border-border p-2.5 bg-muted/20"
                            >
                              {c.passed ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                              )}
                              <div>
                                <p className="text-xs font-medium leading-tight text-foreground">
                                  {c.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground">{c.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL: CREATE RESERVATION ==================== */}
      <Dialog open={createResOpen} onOpenChange={setCreateResOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Đặt chỗ cơ sở kiểm dịch
            </DialogTitle>
            <DialogDescription>
              Tạo lịch giữ chỗ tại cơ sở kiểm dịch cho đơn hàng vận chuyển xuyên quốc gia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Đơn vận chuyển *</Label>
              <select
                value={resForm.requestId}
                onChange={(e) => setResForm((p) => ({ ...p, requestId: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">-- Chọn đơn vận chuyển --</option>
                {availableRequests.map((req) => (
                  <option key={req.requestId} value={req.requestId}>
                    {req.competitionName || `Đơn ${requestCode(req.requestId)}`} ({req.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cơ sở kiểm dịch *</Label>
              <select
                value={resForm.facilityLocationId}
                onChange={(e) => setResForm((p) => ({ ...p, facilityLocationId: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">-- Chọn trạm / cơ sở cách ly --</option>
                {locations.map((loc) => (
                  <option key={loc.locationId} value={loc.locationId}>
                    {loc.name} ({loc.type} - {loc.countryCode || "VNM"})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ngày bắt đầu cách ly *</Label>
                <Input
                  type="date"
                  value={resForm.startDate}
                  onChange={(e) => setResForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Ngày kết thúc cách ly *</Label>
                <Input
                  type="date"
                  value={resForm.endDate}
                  onChange={(e) => setResForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateResOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleCreateReservation}
              disabled={submittingRes}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submittingRes ? "Đang xử lý..." : "Xác nhận đặt chỗ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: CREATE / EDIT CUSTOMS REGULATION ==================== */}
      <Dialog open={regModalOpen} onOpenChange={setRegModalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-primary" />
              {editingReg ? "Chỉnh sửa quy định hải quan" : "Thêm mới quy định hải quan"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình tiêu chuẩn kiểm dịch và danh mục hồ sơ bắt buộc theo quốc gia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mã quốc gia (3 ký tự) *</Label>
                <Input
                  maxLength={3}
                  placeholder="VNM, JPN, AUS, USA..."
                  value={regForm.countryCode}
                  onChange={(e) =>
                    setRegForm((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))
                  }
                  className="h-9 text-xs uppercase font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Loại quy định *</Label>
                <select
                  value={regForm.importExportType}
                  onChange={(e) => setRegForm((p) => ({ ...p, importExportType: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="IMPORT">Nhập khẩu (IMPORT)</option>
                  <option value="EXPORT">Xuất khẩu (EXPORT)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cửa khẩu / Cảng áp dụng (Tùy chọn)</Label>
              <select
                value={regForm.portLocationId}
                onChange={(e) => setRegForm((p) => ({ ...p, portLocationId: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">-- Mặc định toàn quốc / Tất cả cửa khẩu --</option>
                {locations.map((loc) => (
                  <option key={loc.locationId} value={loc.locationId}>
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tiêu chuẩn kiểm dịch</Label>
              <Textarea
                placeholder="Ví dụ: Cách ly 14 ngày trước khi xuất cảnh, xét nghiệm Coggins âm tính trong 30 ngày..."
                rows={3}
                value={regForm.quarantineStandard}
                onChange={(e) => setRegForm((p) => ({ ...p, quarantineStandard: e.target.value }))}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Hồ sơ / Giấy tờ bắt buộc</Label>
              <Textarea
                placeholder="Ví dụ: Hộ chiếu FEI, Giấy chứng nhận kiểm dịch quốc tế, Kết quả xét nghiệm máu..."
                rows={3}
                value={regForm.requiredDocuments}
                onChange={(e) => setRegForm((p) => ({ ...p, requiredDocuments: e.target.value }))}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRegModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRegulation}
              disabled={submittingReg}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {submittingReg ? "Đang lưu..." : "Lưu quy định"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
