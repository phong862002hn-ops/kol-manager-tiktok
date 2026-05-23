import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const staffHash = await bcrypt.hash("staff123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@shop.local" },
    update: {},
    create: {
      email: "admin@shop.local",
      password: adminHash,
      name: "Quản lý Shop",
      role: "MANAGER",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@shop.local" },
    update: {},
    create: {
      email: "staff@shop.local",
      password: staffHash,
      name: "Nhân viên Shop",
      role: "STAFF",
    },
  });

  await prisma.campaign.upsert({
    where: { id: "demo-campaign-mua-he-2026" },
    update: {},
    create: {
      id: "demo-campaign-mua-he-2026",
      name: "Mùa Hè 2026",
      description: "Chiến dịch mẫu để demo",
      startDate: new Date("2026-05-01"),
      endDate: new Date("2026-08-31"),
      budget: 50_000_000,
      targetKoc: 30,
      status: "ACTIVE",
      createdById: admin.id,
      kols: {
        create: [
          { username: "kolmau1", tag: "VIP", status: "BOOKED" },
          { username: "kolmau2", tag: "Tiềm năng", status: "NEGOTIATING" },
          { username: "kolmau3", tag: "Thường", status: "NEW_CONTACT" },
        ],
      },
    },
  });

  console.log("✓ Seeded admin@shop.local / admin123 (MANAGER)");
  console.log("✓ Seeded staff@shop.local / staff123 (STAFF)");
  console.log("✓ Seeded campaign 'Mùa Hè 2026' với 3 KOL mẫu");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
