import { cn } from "@/lib/utils";
import type { TaskStatus, Priority } from "@/data/mockData";

const statusStyles: Record<TaskStatus, string> = {
  "Completed": "bg-success/10 text-success",
  "In Progress": "bg-primary/10 text-primary",
  "Pending": "bg-warning/10 text-warning",
  "Overdue": "bg-destructive/10 text-destructive",
};

const priorityStyles: Record<Priority, string> = {
  "High": "bg-destructive/10 text-destructive",
  "Medium": "bg-warning/10 text-warning",
  "Low": "bg-success/10 text-success",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium", statusStyles[status])}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium", priorityStyles[priority])}>
      {priority}
    </span>
  );
}
