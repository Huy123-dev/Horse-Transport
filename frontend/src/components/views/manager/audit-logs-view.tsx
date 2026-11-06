"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { apiGet } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Info,
  Filter,
} from "lucide-react";
import { formatDateTime } from "@/lib/constants";

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

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("INSERT") || act.includes("ADD")) {
      return "border-emerald-600/40 bg-emerald-950/40 text-emerald-300";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("MODIFY")) {
      return "border-amber-600/40 bg-amber-950/40 text-amber-300";
    }
    if (act.includes("DELETE") || act.includes("REMOVE") || act.includes("CANCEL")) {
      return "border-rose-600/40 bg-rose-950/40 text-rose-300";
    }
    if (act.includes("APPROVE") || act.includes("PASS") || act.includes("CONFIRM")) {
      return "border-cyan-600/40 bg-cyan-950/40 text-cyan-300";
    }
    if (act.includes("PAY") || act.includes("INVOICE")) {
      return "border-yellow-600/40 bg-yellow-950/40 text-yellow-300";
    }
    return "border-border bg-muted/40 text-muted-foreground";
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

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng nhật ký đã nạp</p>
              <p className="text-xl font-bold">{logs.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-950/50 text-emerald-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thao tác tạo mới</p>
              <p className="text-xl font-bold text-emerald-400">
                {logs.filter((l) => l.action.toUpperCase().includes("CREATE")).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-950/50 text-amber-400">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thao tác cập nhật</p>
              <p className="text-xl font-bold text-amber-400">
                {logs.filter((l) => l.action.toUpperCase().includes("UPDATE")).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-950/50 text-cyan-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phê duyệt / Đơn</p>
              <p className="text-xl font-bold text-cyan-400">
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

      {/* Filter and Search Bar */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tìm kiếm từ khóa</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Người dùng, chi tiết, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Loại hành động</Label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Tất cả hành động</option>
                <option value="CREATE">Tạo mới (CREATE)</option>
                <option value="UPDATE">Cập nhật (UPDATE)</option>
                <option value="APPROVE">Phê duyệt (APPROVE)</option>
                <option value="DELETE">Xóa (DELETE)</option>
                <option value="LOGIN">Đăng nhập (LOGIN)</option>
                <option value="PAY">Thanh toán (PAY)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Từ ngày</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Đến ngày</Label>
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

      {/* Audit Log Table */}
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
              <thead className="border-b border-border bg-muted/30 text-muted-foreground font-semibold">
                <tr>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Người thực hiện</th>
                  <th className="px-4 py-3">Hành động</th>
                  <th className="px-4 py-3">Chi tiết</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-muted/10 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary/70" />
                        {formatDateTime(log.createdAt)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                          <User className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {log.userName || "Hệ thống"}
                          </p>
                          {log.userId && (
                            <p className="font-mono text-[10px] text-muted-foreground">
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
                      <p className="max-w-md break-words text-foreground font-normal leading-relaxed">
                        {log.details || "—"}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-muted-foreground/60" />
                        {log.ipAddress || "Internal"}
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
