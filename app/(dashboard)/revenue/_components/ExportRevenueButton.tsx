"use client";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ExportRevenueButton() {
  const params = useSearchParams();
  function handleClick() {
    const sp = new URLSearchParams();
    const from = params.get("from");
    const to = params.get("to");
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const url = `/api/exports/revenue${sp.toString() ? `?${sp.toString()}` : ""}`;
    window.open(url, "_blank");
  }
  return (
    <Button variant="outline" size="sm" onClick={handleClick}>
      Export Excel
    </Button>
  );
}
