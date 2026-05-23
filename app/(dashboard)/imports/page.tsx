import { prisma } from "@/lib/prisma";
import { ImportsPageClient } from "./_components/ImportsPageClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const imports = await prisma.excelImport.findMany({
    orderBy: { uploadedAt: "desc" },
    take: 100,
  });
  return (
    <ImportsPageClient
      imports={imports.map((i) => ({
        id: i.id,
        fileName: i.fileName,
        uploadedBy: i.uploadedBy,
        uploadedAt: i.uploadedAt.toISOString(),
        rowCount: i.rowCount,
      }))}
    />
  );
}
