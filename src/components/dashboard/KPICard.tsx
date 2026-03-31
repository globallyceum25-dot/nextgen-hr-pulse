import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIData } from "@/data/mockData";

export default function KPICard({ data }: { data: KPIData }) {
  const isPercent = data.label.includes("Rate") || data.label.includes("KPI");

  return (
    <div className="card-gradient rounded-lg p-5 transition-snappy hover:shadow-lg hover:shadow-primary/5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{data.label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className="text-2xl font-bold text-card-foreground">
          {data.value}{isPercent ? "%" : ""}
        </p>
        <div className={cn(
          "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
          data.trend === "up" && data.label !== "Overdue Tasks" ? "text-success bg-success/10" : "",
          data.trend === "down" && data.label !== "Overdue Tasks" ? "text-destructive bg-destructive/10" : "",
          data.trend === "down" && data.label === "Overdue Tasks" ? "text-success bg-success/10" : "",
          data.trend === "up" && data.label === "Overdue Tasks" ? "text-destructive bg-destructive/10" : "",
          data.trend === "neutral" ? "text-muted-foreground bg-muted" : "",
        )}>
          {data.trend === "up" ? <TrendingUp size={12} /> : data.trend === "down" ? <TrendingDown size={12} /> : <Minus size={12} />}
          {Math.abs(data.change)}%
        </div>
      </div>
    </div>
  );
}
