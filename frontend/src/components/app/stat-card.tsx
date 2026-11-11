import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Thành phần phụ tạo hiệu ứng đếm số tăng dần (CountUp) từ 0 đến giá trị thực tế
 * giúp các thẻ thống kê trên Bảng điều khiển (Dashboard) sinh động và trực quan hơn.
 */
function CountUp({ value, duration = 0.8 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString("vi-VN"));
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, count, rounded, duration]);

  return <>{display}</>;
}

/**
 * Thành phần Thẻ thống kê chỉ số (StatCard) tái sử dụng trên toàn bộ Dashboard của các vai trò.
 * - Nhận vào `label` (tên chỉ số), `value` (con số hoặc chuỗi tiền tệ), `icon` (biểu tượng)
 *   và `tone` (màu sắc ngữ nghĩa: default, success, warning, danger, info).
 * - Nếu `value` là kiểu số dương (`number`), thẻ sẽ tự động áp dụng hiệu ứng đếm số `CountUp`.
 * - Nếu `value` là chuỗi định dạng sẵn (ví dụ doanh thu `"$8,250.00"`), thẻ sẽ hiển thị nguyên bản.
 */
export function StatCard({
  label,
  value,
  icon,
  tone = "default",
  hint,
  tooltip,
  className,
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
  hint?: string;
  tooltip?: string;
  className?: string;
  delay?: number;
}) {
  // Màu nền và màu biểu tượng của hộp icon theo tông màu trạng thái
  const toneBg: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-[var(--success-bg)] text-[var(--success-fg)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)]",
    danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)]",
    info: "bg-[var(--info-bg)] text-[var(--info-fg)]",
  };

  // Kiểm tra xem giá trị truyền vào có phải là kiểu số nguyên/thực dương để bật hiệu ứng đếm số
  const isNumeric = typeof value === "number" && !Number.isNaN(value) && value > 0;

  const card = (
    <Card className="card-hover group overflow-hidden">
      {/* Thanh viền màu nhấn phía trên đầu mỗi thẻ thống kê */}
      <div
        className={cn("h-1 w-full", {
          "bg-primary": tone === "default",
          "bg-[var(--success)]": tone === "success",
          "bg-[var(--warning)]": tone === "warning",
          "bg-[var(--danger)]": tone === "danger",
          "bg-[var(--info)]": tone === "info",
        })}
      />
      <CardContent className="flex items-center gap-4 p-5">
        {icon && (
          <motion.div
            whileHover={{ scale: 1.08, rotate: -3 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", toneBg[tone])}
          >
            {icon}
          </motion.div>
        )}
        <div className="min-w-0">
          {/* Nhãn chỉ số dùng màu chữ phụ (#D8C8B8), giá trị chính dùng màu chữ chính (#F5EDE3) */}
          <p className="text-sm text-[var(--text-secondary)]">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {isNumeric ? <CountUp value={value} /> : value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {tooltip ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">{card}</div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        card
      )}
    </motion.div>
  );
}
