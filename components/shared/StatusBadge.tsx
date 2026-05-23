import { cn } from "@/lib/utils";

export function StatusBadge({
  label,
  colorClass,
}: {
  label: string;
  colorClass?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        colorClass ?? "bg-gray-100 text-gray-700"
      )}
    >
      {label}
    </span>
  );
}
