import { cn } from "@/lib/utils";

export default function ProgressBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex-1 bg-muted rounded-full overflow-hidden", size === "sm" ? "h-1.5" : "h-2")}>
        <div
          className={cn(
            "h-full rounded-full transition-snappy",
            value >= 80 ? "gradient-success" : value >= 50 ? "gradient-primary" : value >= 30 ? "gradient-warning" : "gradient-destructive"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground w-8 text-right">{value}%</span>
    </div>
  );
}
