"use client";

/**
 * ============================================================================
 * EQUIDELI — NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGS VIEW)
 * ============================================================================
 * Màn hình này dành riêng cho Quản lý Logistics (`LOGISTICS_MANAGER`) nhằm
 * giám sát tính minh bạch và truy vết mọi thao tác nghiệp vụ trên hệ thống.
 *
 * 1. Ý nghĩa bản ghi Nhật ký kiểm toán (`AuditLogItem`):
 *    Mỗi bản ghi lưu trữ: Ai đã thực hiện (`userId`, `userName`), thực hiện
 *    hành động gì (`action`), chi tiết thay đổi dữ liệu (`details`), từ địa chỉ
 *    IP nào (`ipAddress`) và vào thời điểm nào (`createdAt`).
 *
 * 2. Cơ chế lọc kết hợp (Server-side + Client-side Filtering):
 *    - Lọc phía Server qua tham số URL (`/audit-logs?page=...&size=50&action=...&from=...&to=...`):
 *      Ánh xạ nhãn tiếng Việt trên bộ lọc sang mã hành động chuẩn:
 *      + "Tạo mới"     -> `CREATE`
 *      + "Cập nhật"    -> `UPDATE`
 *      + "Phê duyệt"   -> `APPROVE`
 *      + "Xóa dữ liệu" -> `DELETE`
 *      + "Đăng nhập"   -> `LOGIN`
 *      + "Thanh toán"  -> `PAY`
 *    - Lọc tức thời phía Client (`filteredLogs`): Tìm kiếm nhanh theo từ khóa
 *      trong tên người dùng, mã hành động, mô tả chi tiết hoặc địa chỉ IP.
 *
 * 3. Phân loại màu sắc theo ngữ nghĩa hành động (`getActionBadgeColor`):
 *    - Nhóm Tạo mới (`CREATE`, `INSERT`, `ADD`)     -> Xanh lá (`--success-*`)
 *    - Nhóm Cập nhật (`UPDATE`, `EDIT`, `MODIFY`)   -> Vàng hổ phách (`--warning-*`)
 *    - Nhóm Xóa/Hủy (`DELETE`, `REMOVE`, `CANCEL`)  -> Đỏ san hô (`--danger-*`)
 *    - Nhóm Phê duyệt (`APPROVE`, `PASS`, `CONFIRM`)-> Xanh dương (`--info-*`)
 *    - Nhóm Thanh toán (`PAY`, `INVOICE`)           -> Vàng đồng thương hiệu (`primary`)
 * ============================================================================
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { apiGet } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  Search,
  RefreshCw,
  User,
  Globe,
  Calendar,
  Activity,
  ShieldAlert,
  Filter,
} from "lucide-react";
import { formatDateTime } from "@/lib/constants";

/** Cấu trúc một bản ghi Nhật ký kiểm toán (Audit Log) trả về từ Backend */
export interface AuditLogItem {
  logId: string;
  userId: string | null;
  userName: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export function AuditLogsView() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Tải danh sách nhật ký từ API `/audit-logs` theo phân trang (mỗi trang 50 bản ghi).
   * - Khi `append = false`: Tải lại từ trang đầu tiên (khi đổi bộ lọc hoặc nhấn Làm mới).
   * - Khi `append = true`: Nối thêm 50 bản ghi tiếp theo vào cuối danh sách hiện tại.
   */
  const fetchLogs = useCallback(
    async (pageNum = 0, append = false) => {
      try {
        if (!append) setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("page", String(pageNum));
        params.set("size", "50");
        if (actionFilter) params.set("action", actionFilter);
        if (fromDate) params.set("from", `${fromDate}T00:00:00`);
        if (toDate) params.set("to", `${toDate}T23:59:59`);

        const data = await apiGet<AuditLogItem[]>(`/audit-logs?${params.toString()}`);
        if (append) {
          setLogs((prev) => [...prev, ...data]);
        } else {
          setLogs(data);
        }
        // Nếu số bản ghi trả về đủ 50, vẫn còn trang tiếp theo trên máy chủ
        setHasMore(data.length === 50);
        setPage(pageNum);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Không thể tải nhật ký hệ thống";
        setError(msg);
        toast({ title: "Lỗi", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, fromDate, toDate, toast]
  );

  useEffect(() => {
    fetchLogs(0, false);
  }, [fetchLogs]);

  /**
   * Lọc nhanh phía Client theo từ khóa tìm kiếm (`searchTerm`)
   * trên các trường: tên người thực hiện, mã hành động, chi tiết và địa chỉ IP.
   */
  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) return logs;
    const term = searchTerm.toLowerCase();
    return logs.filter(
      (log) =>
        (log.userName && log.userName.toLowerCase().includes(term)) ||
        (log.action && log.action.toLowerCase().includes(term)) ||
        (log.details && log.details.toLowerCase().includes(term)) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(term))
    );
  }, [logs, searchTerm]);

  /**
   * Xác định lớp CSS màu sắc của nhãn hành động (Action Badge)
   * dựa trên từ khóa nghiệp vụ nằm trong mã hành động.
   */
  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("INSERT") || act.includes("ADD")) {
      return "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-fg)]";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("MODIFY")) {
      return "border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-fg)]";
    }
    if (act.includes("DELETE") || act.includes("REMOVE") || act.includes("CANCEL")) {
      return "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-fg)]";
    }
    if (act.includes("APPROVE") || act.includes("PASS") || act.includes("CONFIRM")) {
      return "border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-fg)]";
    }
    if (act.includes("PAY") || act.includes("INVOICE")) {
      return "border-primary/40 bg-primary/15 text-primary";
    }
    return "border-border bg-muted/40 text-[var(--text-secondary)]";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhật ký kiểm toán hệ thống"
        description="Theo dõi toàn bộ lịch sử thao tác, xác thực và thay đổi dữ liệu trên nền tảng EQUIDELI"
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(0, false)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        }
      />

      {/* 4 Thẻ thống kê nhanh số lượng nhật ký đã nạp theo nhóm thao tác */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Tổng nhật ký đã nạp</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{logs.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success-bg)] text-[var(--success-fg)]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Thao tác tạo mới</p>
              <p className="text-xl font-bold text-[var(--success-fg)]">
                {logs.filter((l) => l.action.toUpperCase().includes("CREATE")).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning-fg)]">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Thao tác cập nhật</p>
              <p className="text-xl font-bold text-[var(--warning-fg)]">
                {logs.filter((l) => l.action.toUpperCase().includes("UPDATE")).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--info-bg)] text-[var(--info-fg)]">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Phê duyệt / Đơn</p>
              <p className="text-xl font-bold text-[var(--info-fg)]">
                {
                  logs.filter((l) =>
                    ["APPROVE", "CONFIRM", "STATUS"].some((k) =>
                      l.action.toUpperCase().includes(k)
                    )
                  ).length
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thanh công cụ tìm kiếm từ khóa và lọc theo Loại hành động / Khoảng thời gian */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)]">Tìm kiếm từ khóa</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
                <Input
                  placeholder="Người dùng, chi tiết, địa chỉ IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {/* Bộ lọc ánh xạ nhãn tiếng Việt sang mã hành động gửi lên Backend */}
            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)]">Loại hành động</Label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Tất cả hành động</option>
                <option value="CREATE">Tạo mới</option>
                <option value="UPDATE">Cập nhật</option>
                <option value="APPROVE">Phê duyệt</option>
                <option value="DELETE">Xóa dữ liệu</option>
                <option value="LOGIN">Đăng nhập</option>
                <option value="PAY">Thanh toán</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)]">Từ ngày</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--text-secondary)]">Đến ngày</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách chi tiết các bản ghi Nhật ký kiểm toán */}
      {loading && logs.length === 0 ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchLogs(0, false)} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title="Không tìm thấy bản ghi nhật ký"
          description="Không có nhật ký nào phù hợp với bộ lọc tìm kiếm hiện tại."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/30 text-[var(--text-secondary)] font-semibold">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Chi tiết</th>
                  <th className="px-4 py-3">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-muted/10 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {formatDateTime(log.createdAt)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                          <User className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">
                            {log.userName || "Hệ thống"}
                          </p>
                          {log.userId && (
                            <p className="font-mono text-[10px] text-[var(--text-muted)]">
                              {log.userId.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-md break-words text-[var(--text-primary)] font-normal leading-relaxed">
                        {log.details || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-[var(--text-muted)]" />
                        {log.ipAddress || "Nội bộ"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs(page + 1, true)}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                Tải thêm 50 bản ghi tiếp theo
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
