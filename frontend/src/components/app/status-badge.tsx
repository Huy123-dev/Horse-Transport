import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/constants";

/**
 * Bảng ánh xạ từ tông màu nghiệp vụ (success, warning, danger, info, neutral)
 * sang các biến CSS đã được chuẩn hóa trong `index.css`.
 * - success (#81C995): Đã thanh toán, Đã phê duyệt, Hoàn thành, Sẵn sàng.
 * - warning (#F2BD65): Chưa thanh toán, Thanh toán một phần, Chờ duyệt, Tạm dừng.
 * - danger  (#F0786B): Quá hạn thanh toán, Từ chối, Đã hủy, Bị hạn chế.
 * - info    (#91BCEB): Đang thực hiện, Đang thẩm định, Mới gửi.
 */
const toneClasses: Record<string, string> = {
  success: "bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success-border)] shadow-sm",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning-border)] shadow-sm",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger-border)] shadow-sm",
  info: "bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-border)] shadow-sm",
  neutral: "bg-[var(--muted)] text-[var(--text-secondary)] border-[var(--border)]",
};

/**
 * Thành phần hiển thị huy hiệu trạng thái (StatusBadge) dùng chung trên toàn hệ thống.
 * Tự động nhận diện màu sắc hiển thị thông qua hàm `statusTone(status)` dựa trên
 * nhãn trạng thái tiếng Việt hoặc mã trạng thái truyền vào.
 */
export function StatusBadge({
  status,
  className,
  toneOverride,
}: {
  status: string;
  className?: string;
  toneOverride?: ReturnType<typeof statusTone>;
}) {
  const tone = toneOverride ?? statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap tracking-wide",
        toneClasses[tone],
        className
      )}
    >
      {/* Chấm tròn phát sáng nhẹ bên cạnh nhãn trạng thái giúp nhận diện trực quan nhanh */}
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", {
          "bg-[var(--success-fg)] shadow-[0_0_6px_var(--success)]": tone === "success",
          "bg-[var(--warning-fg)] shadow-[0_0_6px_var(--warning)]": tone === "warning",
          "bg-[var(--danger-fg)] shadow-[0_0_6px_var(--danger)]": tone === "danger",
          "bg-[var(--info-fg)] shadow-[0_0_6px_var(--info)]": tone === "info",
          "bg-[var(--text-secondary)]": tone === "neutral",
        })}
      />
      {status}
    </span>
  );
}
