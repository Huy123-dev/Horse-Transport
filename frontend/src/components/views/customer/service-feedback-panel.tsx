"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Star,
  MessageSquare,
  Truck,
  Heart,
  Navigation,
  Clock,
  CheckCircle2,
  Pencil,
  Loader2,
} from "lucide-react";
import { formatDateTime } from "@/lib/constants";

export interface ServiceFeedback {
  feedbackId: string;
  requestId: string;
  customerId: string;
  customerName?: string;
  requestCode?: string;
  rating: number;
  transportQuality?: number | null;
  horseCare?: number | null;
  trackingUpdates?: number | null;
  punctuality?: number | null;
  comments?: string | null;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ServiceFeedbackPanelProps {
  requestId: string;
  canFeedback: boolean;
  isCustomer: boolean;
}

export function ServiceFeedbackPanel({ requestId, canFeedback, isCustomer }: ServiceFeedbackPanelProps) {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<ServiceFeedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rating, setRating] = useState<number>(5);
  const [transportQuality, setTransportQuality] = useState<number>(5);
  const [horseCare, setHorseCare] = useState<number>(5);
  const [trackingUpdates, setTrackingUpdates] = useState<number>(5);
  const [punctuality, setPunctuality] = useState<number>(5);
  const [comments, setComments] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const data = await apiGet<ServiceFeedback>(`/transport-requests/${requestId}/feedback`);
      if (data && data.feedbackId) {
        setFeedback(data);
        setRating(data.rating || 5);
        setTransportQuality(data.transportQuality || 5);
        setHorseCare(data.horseCare || 5);
        setTrackingUpdates(data.trackingUpdates || 5);
        setPunctuality(data.punctuality || 5);
        setComments(data.comments || "");
        setPhotoUrl(data.photoUrl || "");
      } else {
        setFeedback(null);
      }
    } catch {
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadFeedback);
  }, [requestId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        rating,
        transportQuality,
        horseCare,
        trackingUpdates,
        punctuality,
        comments: comments.trim() || null,
        photoUrl: photoUrl.trim() || null,
      };

      const result = await apiPost<ServiceFeedback>(
        `/transport-requests/${requestId}/feedbacks`,
        payload
      );

      setFeedback(result);
      setIsEditing(false);
      toast({
        title: "Cảm ơn quý khách!",
        description: "Đánh giá dịch vụ của bạn đã được ghi nhận thành công.",
      });
    } catch (err: unknown) {
      toast({
        title: "Không thể lưu đánh giá",
        description: err instanceof Error ? err.message : "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStarSelector = (
    currentVal: number,
    onChange: (val: number) => void,
    readOnly = false
  ) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange(star)}
            className={`transition-colors p-0.5 ${
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"
            }`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= currentVal
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4 text-primary" />
          Đánh giá chất lượng dịch vụ vận chuyển
        </CardTitle>
        {feedback && isCustomer && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa đánh giá
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải thông tin đánh giá…</p>
        ) : feedback && !isEditing ? (
          /* Hiển thị đánh giá đã gửi */
          <div className="space-y-4 rounded-xl border border-border p-4 bg-card/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-500">{feedback.rating}.0</span>
                <div>
                  <div className="flex items-center">
                    {renderStarSelector(feedback.rating, () => {}, true)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Đánh giá chung của Khách hàng</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                Gửi lúc: {formatDateTime(feedback.createdAt)}
                {feedback.updatedAt !== feedback.createdAt && " (Đã cập nhật)"}
              </span>
            </div>

            {/* Chi tiết từng tiêu chí */}
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-2.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-4 w-4 text-primary" /> Chất lượng vận chuyển:
                </span>
                <span className="font-semibold text-foreground">
                  {feedback.transportQuality ?? feedback.rating} / 5 ★
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-2.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Heart className="h-4 w-4 text-rose-500" /> Chăm sóc & An toàn ngựa:
                </span>
                <span className="font-semibold text-foreground">
                  {feedback.horseCare ?? feedback.rating} / 5 ★
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-2.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Navigation className="h-4 w-4 text-sky-500" /> Cập nhật GPS & Tiến độ:
                </span>
                <span className="font-semibold text-foreground">
                  {feedback.trackingUpdates ?? feedback.rating} / 5 ★
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted/60 p-2.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4 text-amber-500" /> Đúng giờ theo cam kết:
                </span>
                <span className="font-semibold text-foreground">
                  {feedback.punctuality ?? feedback.rating} / 5 ★
                </span>
              </div>
            </div>

            {feedback.comments && (
              <div className="rounded-lg bg-muted/70 p-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground">Nhận xét chi tiết:</p>
                <p className="mt-1 whitespace-pre-wrap">{feedback.comments}</p>
              </div>
            )}

            {feedback.photoUrl && (
              <div className="text-xs">
                <span className="text-muted-foreground">Ảnh kỷ niệm / Đính kèm: </span>
                <a
                  href={feedback.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Xem ảnh
                </a>
              </div>
            )}
          </div>
        ) : isCustomer && canFeedback ? (
          /* Form đánh giá mới hoặc chỉnh sửa */
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="rounded-lg bg-primary/5 p-3.5 border border-primary/20 text-xs text-muted-foreground">
              Ý kiến đánh giá của Quý khách là động lực giúp Equideli nâng cao chất lượng dịch vụ vận chuyển ngựa đua chuyên nghiệp và an toàn nhất.
            </div>

            {/* Điểm tổng thể */}
            <div className="space-y-2 rounded-lg border border-border p-3.5 bg-card/40">
              <Label className="text-sm font-semibold flex items-center justify-between">
                <span>Đánh giá tổng quan dịch vụ *</span>
                <span className="text-amber-500 font-bold text-base">{rating} / 5 sao</span>
              </Label>
              {renderStarSelector(rating, setRating)}
            </div>

            {/* 4 tiêu chí chi tiết */}
            <div className="grid gap-4 sm:grid-cols-2 rounded-lg border border-border p-3.5 bg-card/40">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Truck className="h-3.5 w-3.5 text-primary" /> Chất lượng xe & Buồng stall:
                  </span>
                  <span className="font-semibold">{transportQuality} ★</span>
                </Label>
                {renderStarSelector(transportQuality, setTransportQuality)}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Heart className="h-3.5 w-3.5 text-rose-500" /> Chăm sóc thể trạng ngựa:
                  </span>
                  <span className="font-semibold">{horseCare} ★</span>
                </Label>
                {renderStarSelector(horseCare, setHorseCare)}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Navigation className="h-3.5 w-3.5 text-sky-500" /> Cập nhật GPS & Thông báo:
                  </span>
                  <span className="font-semibold">{trackingUpdates} ★</span>
                </Label>
                {renderStarSelector(trackingUpdates, setTrackingUpdates)}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Đúng giờ theo cam kết:
                  </span>
                  <span className="font-semibold">{punctuality} ★</span>
                </Label>
                {renderStarSelector(punctuality, setPunctuality)}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-comment">Nhận xét & Góp ý chi tiết</Label>
              <Textarea
                id="feedback-comment"
                rows={3}
                maxLength={1000}
                placeholder="Chia sẻ trải nghiệm của bạn về tài xế, nhân viên chăm sóc đi kèm, sự chu đáo..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-photo">Đường dẫn hình ảnh đính kèm (tùy chọn)</Label>
              <Input
                id="feedback-photo"
                type="url"
                maxLength={512}
                placeholder="https://..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={submitting}
                >
                  Hủy
                </Button>
              )}
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {feedback ? "Lưu thay đổi đánh giá" : "Gửi đánh giá dịch vụ"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            Đánh giá chất lượng dịch vụ sẽ khả dụng sau khi chuyến vận chuyển được bàn giao hoàn tất cho khách hàng.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
