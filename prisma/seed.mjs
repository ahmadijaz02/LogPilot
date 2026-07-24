/**
 * LogPilot database seed (plain ESM — run with `npm run db:seed`).
 *
 * Creates one carrier, a fleet manager, and two drivers each with a realistic
 * week of daily logs. All demo accounts use the password: logpilot
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function isoForOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Build fully-tiled entries (0→1440) from ordered change-points. */
function buildEntries(changes) {
  const entries = [];
  let start = 0;
  for (const c of changes) {
    entries.push({
      status: c.status,
      startMin: start,
      endMin: c.at,
      location: c.location ?? null,
      remark: c.remark ?? null,
    });
    start = c.at;
  }
  if (start < 1440) entries.push({ status: "OFF", startMin: start, endMin: 1440 });
  return entries;
}

function remarksFrom(changes) {
  return changes
    .filter((c) => c.location)
    .map((c) => ({ timeMin: c.at === undefined ? 0 : 0, location: c.location, note: c.remark ?? null }));
}

const MARCUS_WEEK = [
  { off: -6, truck: "TR-4471", trailer: "TL-9930", ship: "BOL-88231", commodity: "Palletized dry goods", miles: 512, certified: true,
    changes: [
      { status: "OFF", at: 360, location: "Columbus, OH" },
      { status: "ON", at: 390, location: "Columbus, OH", remark: "Pre-trip inspection" },
      { status: "D", at: 630, location: "Columbus, OH" },
      { status: "ON", at: 660, location: "Dayton, OH", remark: "30-min break / fuel" },
      { status: "D", at: 900, location: "Richmond, IN" },
      { status: "ON", at: 945, location: "Indianapolis, IN", remark: "Delivery unload" },
      { status: "OFF", at: 990, location: "Indianapolis, IN" },
    ] },
  { off: -5, truck: "TR-4471", trailer: "TL-9930", ship: "BOL-88240", commodity: "Automotive parts", miles: 486, certified: true,
    changes: [
      { status: "OFF", at: 420, location: "Indianapolis, IN" },
      { status: "ON", at: 450, location: "Indianapolis, IN", remark: "Pre-trip" },
      { status: "D", at: 690, location: "Indianapolis, IN" },
      { status: "OFF", at: 735, location: "Effingham, IL", remark: "30-min break" },
      { status: "D", at: 975, location: "St. Louis, MO" },
      { status: "ON", at: 1020, location: "St. Louis, MO", remark: "Unload" },
      { status: "OFF", at: 1065, location: "St. Louis, MO" },
    ] },
  { off: -4, truck: "TR-4471", trailer: "TL-9931", ship: "BOL-88259", commodity: "Refrigerated produce", miles: 604, certified: true,
    changes: [
      { status: "OFF", at: 360, location: "St. Louis, MO" },
      { status: "ON", at: 390, location: "St. Louis, MO", remark: "Reefer check" },
      { status: "D", at: 630, location: "St. Louis, MO" },
      { status: "ON", at: 675, location: "Columbia, MO", remark: "Break" },
      { status: "D", at: 915, location: "Kansas City, MO" },
      { status: "SB", at: 960, location: "Kansas City, MO", remark: "Sleeper berth" },
    ] },
  { off: -3, truck: "TR-4471", trailer: "TL-9931", ship: "BOL-88268", commodity: "Refrigerated produce", miles: 398, certified: true,
    changes: [
      { status: "SB", at: 300, location: "Kansas City, MO" },
      { status: "ON", at: 345, location: "Kansas City, MO", remark: "Delivery" },
      { status: "D", at: 585, location: "Kansas City, MO" },
      { status: "OFF", at: 630, location: "Topeka, KS", remark: "Break" },
      { status: "D", at: 810, location: "Wichita, KS" },
      { status: "OFF", at: 855, location: "Wichita, KS" },
    ] },
  { off: -2, truck: "TR-4471", trailer: "TL-9932", ship: "BOL-88277", commodity: "Building materials", miles: 545, certified: true,
    changes: [
      { status: "OFF", at: 390, location: "Wichita, KS" },
      { status: "ON", at: 420, location: "Wichita, KS", remark: "Load / pre-trip" },
      { status: "D", at: 660, location: "Wichita, KS" },
      { status: "ON", at: 705, location: "Salina, KS", remark: "30-min break" },
      { status: "D", at: 945, location: "Denver, CO" },
      { status: "OFF", at: 990, location: "Denver, CO" },
    ] },
  { off: -1, truck: "TR-4471", trailer: "TL-9932", ship: "BOL-88289", commodity: "Building materials", miles: 421, certified: true,
    changes: [
      { status: "OFF", at: 420, location: "Denver, CO" },
      { status: "ON", at: 450, location: "Denver, CO", remark: "Unload" },
      { status: "D", at: 690, location: "Denver, CO" },
      { status: "OFF", at: 735, location: "Colorado Springs, CO", remark: "Break" },
      { status: "D", at: 915, location: "Pueblo, CO" },
      { status: "ON", at: 960, location: "Pueblo, CO", remark: "Post-trip inspection" },
      { status: "OFF", at: 990, location: "Pueblo, CO" },
    ] },
  { off: 0, truck: "TR-4471", trailer: "TL-9932", ship: "BOL-88301", commodity: "Consumer electronics", miles: 288, certified: false,
    changes: [
      { status: "OFF", at: 375, location: "Pueblo, CO" },
      { status: "ON", at: 405, location: "Pueblo, CO", remark: "Pre-trip inspection" },
      { status: "D", at: 615, location: "Pueblo, CO" },
      { status: "ON", at: 660, location: "Trinidad, CO", remark: "30-min break / fuel" },
      { status: "D", at: 840, location: "Raton, NM" },
    ] },
];

const DANA_WEEK = [
  { off: -3, truck: "TR-3390", trailer: "TL-7712", ship: "BOL-55120", commodity: "Packaged food", miles: 452, certified: true,
    changes: [
      { status: "OFF", at: 390, location: "Columbus, OH" },
      { status: "ON", at: 420, location: "Columbus, OH", remark: "Pre-trip" },
      { status: "D", at: 660, location: "Columbus, OH" },
      { status: "OFF", at: 705, location: "Toledo, OH", remark: "Break" },
      { status: "D", at: 930, location: "Detroit, MI" },
      { status: "OFF", at: 975, location: "Detroit, MI" },
    ] },
  { off: -2, truck: "TR-3390", trailer: "TL-7712", ship: "BOL-55139", commodity: "Retail goods", miles: 511, certified: true,
    changes: [
      { status: "OFF", at: 360, location: "Detroit, MI" },
      { status: "ON", at: 390, location: "Detroit, MI", remark: "Load" },
      { status: "D", at: 690, location: "Detroit, MI" },
      { status: "D", at: 930, location: "Cleveland, OH" },
      { status: "ON", at: 975, location: "Cleveland, OH", remark: "Unload — no break logged" },
      { status: "OFF", at: 1020, location: "Cleveland, OH" },
    ] },
  { off: -1, truck: "TR-3390", trailer: "TL-7713", ship: "BOL-55148", commodity: "Industrial equipment", miles: 388, certified: true,
    changes: [
      { status: "OFF", at: 420, location: "Cleveland, OH" },
      { status: "ON", at: 450, location: "Cleveland, OH", remark: "Pre-trip" },
      { status: "D", at: 690, location: "Cleveland, OH" },
      { status: "ON", at: 735, location: "Akron, OH", remark: "Break" },
      { status: "D", at: 915, location: "Columbus, OH" },
      { status: "OFF", at: 960, location: "Columbus, OH" },
    ] },
];

async function createDriverWithLogs(carrier, passwordHash, user, driverData, week) {
  const created = await prisma.user.create({
    data: {
      name: user.name,
      email: user.email,
      passwordHash,
      role: "DRIVER",
      carrierId: carrier.id,
      driver: { create: { ...driverData, carrierId: carrier.id } },
    },
    include: { driver: true },
  });
  const driverId = created.driver.id;

  for (const day of week) {
    const entries = buildEntries(day.changes);
    const remarks = day.changes
      .filter((c) => c.location)
      .map((c) => ({ timeMin: entries.find((e) => e.location === c.location)?.startMin ?? 0, location: c.location, note: c.remark ?? null }));

    await prisma.dailyLog.create({
      data: {
        driverId,
        date: isoForOffset(day.off),
        driverName: user.name,
        carrierName: carrier.name,
        mainOffice: carrier.mainOffice,
        homeTerminal: carrier.homeTerminal,
        truckNumber: day.truck,
        trailerNumber: day.trailer,
        shippingNumber: day.ship,
        commodity: day.commodity,
        totalMiles: day.miles,
        cycle: "70/8",
        certified: day.certified,
        status: day.certified ? "CERTIFIED" : "DRAFT",
        entries: { create: entries },
        remarks: { create: remarks },
        shippingDocs: { create: [{ proNumber: day.ship, commodity: day.commodity }] },
      },
    });
  }
  return created;
}

async function main() {
  // Clean slate (safe: local demo DB).
  await prisma.dailyLog.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
  await prisma.carrier.deleteMany();

  const passwordHash = await bcrypt.hash("logpilot", 10);

  const carrier = await prisma.carrier.create({
    data: {
      name: "Ridgeline Freight Systems, LLC",
      mainOffice: "4820 Corporate Dr, Columbus, OH 43231",
      homeTerminal: "1200 Logistics Pkwy, Columbus, OH 43217",
      dotNumber: "US DOT 2841196",
    },
  });

  await prisma.user.create({
    data: {
      name: "Priya Nair",
      email: "manager@ridgeline.co",
      passwordHash,
      role: "FLEET_MANAGER",
      carrierId: carrier.id,
    },
  });

  await createDriverWithLogs(
    carrier,
    passwordHash,
    { name: "Marcus Bennett", email: "driver@ridgeline.co" },
    {
      licenseNumber: "OH-D4471-982",
      licenseState: "OH",
      homeTerminal: "Columbus, OH",
      mainOffice: carrier.mainOffice,
      timezone: "America/New_York",
      cycle: "70/8",
      truckNumber: "TR-4471",
      trailerNumber: "TL-9932",
    },
    MARCUS_WEEK,
  );

  await createDriverWithLogs(
    carrier,
    passwordHash,
    { name: "Dana Ortiz", email: "dana@ridgeline.co" },
    {
      licenseNumber: "OH-D3390-114",
      licenseState: "OH",
      homeTerminal: "Columbus, OH",
      mainOffice: carrier.mainOffice,
      timezone: "America/New_York",
      cycle: "70/8",
      truckNumber: "TR-3390",
      trailerNumber: "TL-7713",
    },
    DANA_WEEK,
  );

  console.log("✔ Seed complete. Accounts (password: logpilot):");
  console.log("  Fleet Manager  → manager@ridgeline.co");
  console.log("  Driver         → driver@ridgeline.co");
  console.log("  Driver         → dana@ridgeline.co");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
