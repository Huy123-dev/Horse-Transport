import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/constants";

const toneClasses: Record<string, string> = {
  success: "bg-[var(--success-bg)] text-[var(--success-fg)] border-[var(--success)]/30",
  warning: "bg-[var(--warning-bg)] text-[var(--warning-fg)] border-[var(--warning)]/30",
  danger: "bg-[var(--danger-bg)] text-[var(--danger-fg)] border-[var(--danger)]/30",
  info: "bg-[var(--info-bg)] text-[var(--info-fg)] border-[var(--copper)]/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", {
        "bg-[var(--success)]": tone === "success",
        "bg-[var(--warning)]": tone === "warning",
        "bg-[var(--danger)]": tone === "danger",
        "bg-[var(--copper)]": tone === "info",
        "bg-muted-foreground": tone === "neutral",
      })} />
      {status}
    </span>
  );
}
