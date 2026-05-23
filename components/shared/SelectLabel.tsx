// Hiển thị label đã map cho 1 enum value bên trong SelectTrigger
// Lý do: base-ui Select.Value default hiển thị raw value khi item chưa mount
export function SelectLabelText({
  value,
  labels,
  placeholder = "—",
}: {
  value: string | null | undefined;
  labels: Record<string, string>;
  placeholder?: string;
}) {
  return (
    <span data-slot="select-value" className="flex flex-1 text-left line-clamp-1">
      {value && labels[value] ? labels[value] : placeholder}
    </span>
  );
}
