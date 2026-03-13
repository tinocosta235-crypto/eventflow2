import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function code() {
  return "REG-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function main() {
  const hashedPassword = await bcrypt.hash("demo1234", 12);

  const org = await prisma.organization.upsert({
    where: { slug: "phorma-demo" },
    update: {},
    create: { name: "Phorma Demo", slug: "phorma-demo", plan: "FREE" },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@phorma.it" },
    update: {},
    create: { name: "Admin Demo", email: "demo@phorma.it", password: hashedPassword },
  });

  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, role: "OWNER" },
  });

  const e1 = await prisma.event.upsert({
    where: { slug: "forum-innovazione-2025" },
    update: {},
    create: {
      organizationId: org.id,
      slug: "forum-innovazione-2025",
      title: "Forum Nazionale Innovazione 2025",
      description: "Il principale appuntamento annuale sull'innovazione tecnologica in Italia.",
      location: "Milano, MiCo Convention Center",
      startDate: new Date("2025-05-15T09:00:00"),
      endDate: new Date("2025-05-16T18:00:00"),
      status: "PUBLISHED",
      capacity: 500,
      currentCount: 342,
      tags: JSON.stringify(["tecnologia", "innovazione", "AI"]),
    },
  });

  const e2 = await prisma.event.upsert({
    where: { slug: "summit-hr-2025" },
    update: {},
    create: {
      organizationId: org.id,
      slug: "summit-hr-2025",
      title: "HR Summit Italia 2025",
      description: "Il futuro del lavoro e delle risorse umane nel nuovo paradigma digitale.",
      location: "Roma, Palazzo dei Congressi",
      startDate: new Date("2025-06-12T09:00:00"),
      endDate: new Date("2025-06-13T17:00:00"),
      status: "PUBLISHED",
      capacity: 300,
      currentCount: 185,
      tags: JSON.stringify(["HR", "lavoro", "people"]),
    },
  });

  await prisma.event.upsert({
    where: { slug: "conferenza-sostenibilita-2025" },
    update: {},
    create: {
      organizationId: org.id,
      slug: "conferenza-sostenibilita-2025",
      title: "Conferenza Sostenibilità Aziendale",
      description: "ESG, circular economy e strategie green per le imprese italiane.",
      location: "Bologna, BolognaFiere",
      startDate: new Date("2025-09-20T10:00:00"),
      endDate: new Date("2025-09-20T18:00:00"),
      status: "DRAFT",
      capacity: 400,
      currentCount: 0,
      tags: JSON.stringify(["sostenibilità", "ESG", "green"]),
    },
  });

  const participants = [
    { firstName: "Marco", lastName: "Rossi", email: "marco.rossi@techaziende.it", company: "TechAziende Srl", jobTitle: "CEO", status: "CONFIRMED", paymentStatus: "PAID", ticketPrice: 200 },
    { firstName: "Laura", lastName: "Bianchi", email: "l.bianchi@startup.it", company: "Startup XYZ", jobTitle: "CTO", status: "CONFIRMED", paymentStatus: "PAID", ticketPrice: 200 },
    { firstName: "Giuseppe", lastName: "Ferrari", email: "g.ferrari@corp.it", company: "Corp Italia", jobTitle: "Manager", status: "CONFIRMED", paymentStatus: "FREE", ticketPrice: null },
    { firstName: "Anna", lastName: "Conti", email: "anna.conti@innovation.it", company: "Innovation Lab", jobTitle: "Product Manager", status: "CONFIRMED", paymentStatus: "PAID", ticketPrice: 200 },
    { firstName: "Luca", lastName: "Mancini", email: "l.mancini@digital.it", company: "Digital Agency", jobTitle: "Designer", status: "PENDING", paymentStatus: "PENDING", ticketPrice: 200 },
    { firstName: "Sofia", lastName: "Romano", email: "s.romano@cloud.it", company: "CloudIT", jobTitle: "DevOps", status: "CONFIRMED", paymentStatus: "PAID", ticketPrice: 200 },
    { firstName: "Alessandro", lastName: "Greco", email: "a.greco@media.it", company: "Media Group", jobTitle: "Director", status: "WAITLIST", paymentStatus: "FREE", ticketPrice: null },
    { firstName: "Chiara", lastName: "Russo", email: "c.russo@consult.it", company: "Consulting Partners", jobTitle: "Consultant", status: "CONFIRMED", paymentStatus: "PAID", ticketPrice: 200 },
  ];

  for (const p of participants) {
    try {
      await prisma.registration.create({
        data: { eventId: e1.id, registrationCode: code(), source: "web", ...p },
      });
    } catch { /* skip duplicates */ }
  }

  for (const p of participants.slice(0, 3)) {
    try {
      await prisma.registration.create({
        data: { eventId: e2.id, registrationCode: code(), source: "web", ...p, email: p.email.replace("@", "+hr@") },
      });
    } catch { /* skip */ }
  }

  console.log("✅ Seed completato!");
  console.log(`  🏢 Organizzazione: ${org.name}`);
  console.log(`  👤 Utente demo: demo@phorma.it / demo1234`);
  console.log(`  📅 3 eventi creati`);
  console.log(`  👥 ${participants.length + 3} registrazioni create`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
