"use client";
import useSWR from "swr";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { fetcher } from "@/lib/fetcher";

type User = { id: string; name: string };

export function StaffFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const value = params.get("staffId") ?? "__all";
  const { data: users } = useSWR<User[]>("/api/users", fetcher);

  function push(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next === "__all") sp.delete("staffId");
    else sp.set("staffId", next);
    router.push(`${pathname}?${sp.toString()}`);
  }

  const selected = users?.find((u) => u.id === value);

  return (
    <div className="flex items-center gap-1">
      <Label className="text-xs text-gray-500 whitespace-nowrap">Nhân sự</Label>
      <Select value={value} onValueChange={(v) => v && push(v)}>
        <SelectTrigger className="h-8 w-[160px]">
          <span data-slot="select-value" className="flex flex-1 text-left line-clamp-1">
            {value === "__all" ? "Tất cả" : selected?.name ?? "—"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Tất cả</SelectItem>
          {users?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
