import { cn } from "@/lib/utils";

type Variant = "primary" | "success" | "warning" | "destructive" | "secondary";

const variantClass: Record<Variant, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  destructive: "bg-destructive-soft text-destructive",
  secondary: "bg-secondary text-secondary-foreground",
};

export function SemanticBadge({
  children,
  variant = "secondary",
  dot = false,
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
        variantClass[variant],
        className
      )}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "currentColor" }}
        />
      )}
      {children}
    </span>
  );
}
