"use client";

import { useEffect, useState, useMemo } from "react";
import { apiGet } from "@/lib/api-client";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState, LoadingState, ErrorState } from "@/components/app/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Star,
  MessageSquare,
  Search,
  Truck,
  Heart,
  Navigation,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDateTime, requestCode } from "@/lib/constants";
import { ServiceFeedback } from "@/components/views/customer/service-feedback-panel";
import { useAppStore } from "@/store/app-store";

export function FeedbackManagementView() {
  const { navigate } = useAppStore();
  const [feedbacks, setFeedbacks] = useState<ServiceFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | "ALL">("ALL");

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await apiGet<ServiceFeedback[]>("/feedbacks");
      setFeedbacks(data);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách đánh giá.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadFeedbacks);
  }, []);

  const stats = useMemo(() => {
    const total = feedbacks.length;
    if (total === 0) {
      return {
        total: 0,
        avgRating: 0,
        avgTransport: 0,
        avgCare: 0,
        avgTracking: 0,
        avgPunctual: 0,
      };
    }

    const avg = (fn: (f: ServiceFeedback) => number | null | undefined) => {
      const valid = feedbacks.map(fn).filter((v): v is number => v != null && v > 0);
      return valid.length > 0 ? (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) : "0";
    };

    return {
      total,
      avgRating: avg((f) => f.rating),
      avgTransport: avg((f) => f.transportQuality ?? f.rating),
      avgCare: avg((f) => f.horseCare ?? f.rating),
      avgTracking: avg((f) => f.trackingUpdates ?? f.rating),
      avgPunctual: avg((f) => f.punctuality ?? f.rating),
    };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((fb) => {
      const matchSearch =
        !search ||
        fb.requestId.toLowerCase().includes(search.toLowerCase()) ||
        (fb.requestCode?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (fb.customerName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (fb.comments?.toLowerCase().includes(search.toLowerCase()) ?? false);

      const matchRating = ratingFilter === "ALL" || fb.rating === ratingFilter;
      return matchSearch && matchRating;
    });
  }, [feedbacks, search, ratingFilter]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đánh giá & Phản hồi Dịch vụ"
        description="Theo dõi ý kiến đánh giá từ khách hàng để kiểm soát và tối ưu chất lượng vận chuyển"
        icon={<MessageSquare className="h-5 w-5" />}
        actions={
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Tìm kiếm đánh giá"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo đơn, khách hàng..."
              className="pl-9"
            />
          </div>
        }
      />

      {/* Thẻ thống kê điểm chỉ số chất lượng */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Star className="h-6 w-6 fill-amber-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Điểm chung ({stats.total} lượt)</p>
              <p className="text-xl font-extrabold text-amber-500">{stats.avgRating} / 5.0</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chất lượng xe & stall</p>
              <p className="text-lg font-bold">{stats.avgTransport} ★</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chăm sóc ngựa</p>
              <p className="text-lg font-bold text-rose-600">{stats.avgCare} ★</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cập nhật GPS</p>
              <p className="text-lg font-bold text-sky-600">{stats.avgTracking} ★</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-600/10 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Đúng giờ cam kết</p>
              <p className="text-lg font-bold">{stats.avgPunctual} ★</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lọc theo số sao */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setRatingFilter("ALL")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            ratingFilter === "ALL"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/70"
          }`}
        >
          Tất cả ({feedbacks.length})
        </button>
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = feedbacks.filter((f) => f.rating === stars).length;
          return (
            <button
              key={stars}
              onClick={() => setRatingFilter(stars)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
                ratingFilter === stars
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              <span>{stars} sao</span>
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Danh sách các đánh giá */}
      {filteredFeedbacks.length === 0 ? (
        <EmptyState
          illustration="no-data"
          title="Không có đánh giá nào"
          description={
            search || ratingFilter !== "ALL"
              ? "Thử thay đổi bộ lọc tìm kiếm."
              : "Chưa có phản hồi đánh giá nào từ khách hàng."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((fb) => (
            <Card key={fb.feedbackId} className="transition-all hover:border-primary/40 hover:shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s <= fb.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-foreground text-sm">{fb.rating}.0 / 5</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-medium text-foreground">{fb.customerName || "Khách hàng"}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate("request-detail", { id: fb.requestId })}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                    >
                      Đơn {fb.requestCode || requestCode(fb.requestId)}
                      <ExternalLink className="h-3 w-3" />
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(fb.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Điểm các tiêu chí */}
                <div className="grid gap-2 sm:grid-cols-4 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3 w-3 text-primary" /> Vận chuyển:
                    </span>
                    <span className="font-semibold">{fb.transportQuality ?? fb.rating} ★</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Heart className="h-3 w-3 text-rose-500" /> Thể trạng:
                    </span>
                    <span className="font-semibold">{fb.horseCare ?? fb.rating} ★</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Navigation className="h-3 w-3 text-sky-500" /> GPS:
                    </span>
                    <span className="font-semibold">{fb.trackingUpdates ?? fb.rating} ★</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-500" /> Đúng giờ:
                    </span>
                    <span className="font-semibold">{fb.punctuality ?? fb.rating} ★</span>
                  </div>
                </div>

                {fb.comments && (
                  <p className="whitespace-pre-wrap text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                    “{fb.comments}”
                  </p>
                )}

                {fb.photoUrl && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Ảnh đính kèm: </span>
                    <a href={fb.photoUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                      Xem hình ảnh
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
