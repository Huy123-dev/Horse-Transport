import { cn } from "@/lib/utils";
import { ListSkeleton, GridSkeleton, DetailSkeleton } from "./skeleton";
import { EmptyIllustration } from "./empty-illustration";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  illustration = "empty-list",
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  illustration?: "empty-list" | "no-results" | "no-data" | "success" | "error";
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center animate-fade-in-up", className)}>
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      ) : (
        <EmptyIllustration type={illustration} />
      )}
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ className, variant = "list" }: { className?: string; variant?: "list" | "grid" | "detail" | "spinner" }) {
  if (variant === "grid") return <GridSkeleton />;
  if (variant === "detail") return <DetailSkeleton />;
  if (variant === "spinner") {
    return (
      <div className={cn("flex items-center justify-center gap-3 py-16 text-muted-foreground", className)}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm">Đang tải dữ liệu...</span>
      </div>
    );
  }
  return <ListSkeleton />;
}

export function ErrorState({ message, className, onRetry }: { message: string; className?: string; onRetry?: () => void }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-6 py-12 text-center animate-fade-in-up", className)}>
      <p className="font-semibold text-[var(--danger-fg)]">Đã xảy ra lỗi</p>
      <p className="text-sm text-[var(--danger-fg)]/80">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-lg border border-[var(--danger)]/30 px-4 py-1.5 text-sm font-medium text-[var(--danger-fg)] hover:bg-[var(--danger)]/10 transition-colors">Thử lại</button>
      )}
    </div>
  );
}
