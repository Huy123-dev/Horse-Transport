import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/constants";

const toneClasses: Record<string, string> = {
  success: "bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success)]/40 shadow-sm",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning)]/40 shadow-sm",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger)]/40 shadow-sm",
  info: "bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--info-border)]/40 shadow-sm",
  neutral: "bg-[var(--muted)] text-[var(--text-secondary)] border-[var(--border)]",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap tracking-wide",
        toneClasses[tone],
        className
      )}
    >
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
