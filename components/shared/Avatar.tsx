export function Avatar({
  name,
  size = 24,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const cleanName = name.replace(/^@/, "");
  const initials =
    cleanName
      .split(/[.\s_\-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  const hue =
    (cleanName.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 17) % 360;
  return (
    <div
      className={`rounded-full grid place-items-center text-white font-semibold shrink-0 ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: `hsl(${hue}, 45%, 62%)`,
        fontSize: size * 0.4,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
