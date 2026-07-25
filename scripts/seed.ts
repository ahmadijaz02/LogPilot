import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

interface CarrierTable {
  id: string;
  name: string;
  mainOffice: string | null;
  homeTerminal: string | null;
  dotNumber: string | null;
  createdAt: Date;
}

interface UserTable {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "DRIVER" | "FLEET_MANAGER";
  carrierId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DriverTable {
  id: string;
  userId: string;
  licenseNumber: string;
  licenseState: string;
  homeTerminal: string | null;
  mainOffice: string | null;
  timezone: string;
  cycle: string;
  truckNumber: string | null;
  trailerNumber: string | null;
  signatureData: string | null;
  carrierId: string | null;
}

interface DailyLogTable {
  id: string;
  driverId: string;
  date: string;
  driverName: string;
  coDriverName: string | null;
  carrierName: string;
  mainOffice: string | null;
  homeTerminal: string | null;
  truckNumber: string | null;
  trailerNumber: string | null;
  shippingNumber: string | null;
  commodity: string | null;
  totalMiles: number;
  cycle: string;
  status: "DRAFT" | "CERTIFIED";
  certified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DutyEntryTable {
  id: string;
  logId: string;
  status: "OFF" | "SB" | "D" | "ON";
  startMin: number;
  endMin: number;
  location: string | null;
  remark: string | null;
}

interface Database {
  Carrier: CarrierTable;
  User: UserTable;
  Driver: DriverTable;
  DailyLog: DailyLogTable;
  DutyEntry: DutyEntryTable;
}

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }),
  }),
});

async function createDemoLogs(driverId: string, driverName: string) {
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const logDate = new Date(today);
    logDate.setDate(logDate.getDate() - i);
    const dateStr = logDate.toISOString().slice(0, 10);

    // Check if log already exists
    const existing = await db
      .selectFrom("DailyLog")
      .selectAll()
      .where("driverId", "=", driverId)
      .where("date", "=", dateStr)
      .executeTakeFirst();

    if (existing) continue;

    const logId = uuidv4();
    await db
      .insertInto("DailyLog")
      .values({
        id: logId,
        driverId,
        date: dateStr,
        driverName,
        coDriverName: null,
        carrierName: "Ridgeline Transportation",
        mainOffice: "123 Commerce Ave, Atlanta, GA 30303",
        homeTerminal: "456 Logistics Blvd, Dallas, TX 75201",
        truckNumber: "TR-001",
        trailerNumber: "TRL-001",
        shippingNumber: null,
        commodity: null,
        totalMiles: Math.floor(350 + Math.random() * 100),
        cycle: "70/8",
        status: i === 0 ? "DRAFT" : "CERTIFIED",
        certified: i !== 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .execute();

    // Add duty entries
    const entries = [
      { status: "OFF" as const, startMin: 0, endMin: 360, location: "Atlanta, GA" },
      { status: "D" as const, startMin: 360, endMin: 780, location: "En route" },
      { status: "SB" as const, startMin: 780, endMin: 900, location: "Rest Area" },
      { status: "D" as const, startMin: 900, endMin: 1260, location: "En route" },
      { status: "ON" as const, startMin: 1260, endMin: 1440, location: "Dallas, TX" },
    ];

    for (const entry of entries) {
      await db
        .insertInto("DutyEntry")
        .values({
          id: uuidv4(),
          logId,
          status: entry.status,
          startMin: entry.startMin,
          endMin: entry.endMin,
          location: entry.location,
          remark: null,
        })
        .execute();
    }
  }
}

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Get or create carrier
    let carrier = await db
      .selectFrom("Carrier")
      .selectAll()
      .where("name", "=", "Ridgeline Transportation")
      .executeTakeFirst();

    const carrierId = carrier?.id ?? uuidv4();
    if (!carrier) {
      await db
        .insertInto("Carrier")
        .values({
          id: carrierId,
          name: "Ridgeline Transportation",
          mainOffice: "123 Commerce Ave, Atlanta, GA 30303",
          homeTerminal: "456 Logistics Blvd, Dallas, TX 75201",
          dotNumber: "DOT123456",
          createdAt: new Date(),
        })
        .execute();
      console.log("✅ Created carrier: Ridgeline Transportation");
    } else {
      console.log("✓ Carrier already exists");
    }

    const driverPasswordHash = await bcrypt.hash("logpilot", 10);

    // Create/get first driver
    let driver1 = await db
      .selectFrom("User")
      .leftJoin("Driver", "Driver.userId", "User.id")
      .select(["User.id", "Driver.id as driverId"])
      .where("User.email", "=", "driver@ridgeline.co")
      .executeTakeFirst();

    let driver1UserId = (driver1 as any)?.id as string;
    let driver1Id = (driver1 as any)?.driverId as string;

    if (!driver1) {
      driver1UserId = uuidv4();
      driver1Id = uuidv4();

      await db
        .insertInto("User")
        .values({
          id: driver1UserId,
          name: "John Driver",
          email: "driver@ridgeline.co",
          passwordHash: driverPasswordHash,
          role: "DRIVER",
          carrierId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
      console.log("✅ Created driver: driver@ridgeline.co");

      await db
        .insertInto("Driver")
        .values({
          id: driver1Id,
          userId: driver1UserId,
          licenseNumber: "DL123456789",
          licenseState: "GA",
          homeTerminal: "456 Logistics Blvd, Dallas, TX 75201",
          mainOffice: "123 Commerce Ave, Atlanta, GA 30303",
          timezone: "America/Chicago",
          cycle: "70/8",
          truckNumber: "TR-001",
          trailerNumber: "TRL-001",
          signatureData: null,
          carrierId,
        })
        .execute();
      console.log("✅ Created driver profile for John Driver");
    } else {
      console.log("✓ Driver already exists: driver@ridgeline.co");
    }

    // Create demo logs for first driver
    await createDemoLogs(driver1Id, "John Driver");
    console.log("✅ Created demo logs for John Driver");

    // Create/get second driver (Ahmad)
    let driver2 = await db
      .selectFrom("User")
      .leftJoin("Driver", "Driver.userId", "User.id")
      .select(["User.id", "Driver.id as driverId"])
      .where("User.email", "=", "ahmad@ridgeline.co")
      .executeTakeFirst();

    let driver2UserId = (driver2 as any)?.id as string;
    let driver2Id = (driver2 as any)?.driverId as string;

    if (!driver2) {
      driver2UserId = uuidv4();
      driver2Id = uuidv4();

      await db
        .insertInto("User")
        .values({
          id: driver2UserId,
          name: "Ahmad",
          email: "ahmad@ridgeline.co",
          passwordHash: driverPasswordHash,
          role: "DRIVER",
          carrierId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
      console.log("✅ Created driver: ahmad@ridgeline.co");

      await db
        .insertInto("Driver")
        .values({
          id: driver2Id,
          userId: driver2UserId,
          licenseNumber: "DL987654321",
          licenseState: "TX",
          homeTerminal: "456 Logistics Blvd, Dallas, TX 75201",
          mainOffice: "123 Commerce Ave, Atlanta, GA 30303",
          timezone: "America/Chicago",
          cycle: "70/8",
          truckNumber: "TR-002",
          trailerNumber: "TRL-002",
          signatureData: null,
          carrierId,
        })
        .execute();
      console.log("✅ Created driver profile for Ahmad");
    } else {
      console.log("✓ Driver already exists: ahmad@ridgeline.co");
    }

    // Create demo logs for second driver
    await createDemoLogs(driver2Id, "Ahmad");
    console.log("✅ Created demo logs for Ahmad");

    // Create/get fleet manager
    let manager = await db
      .selectFrom("User")
      .where("email", "=", "manager@ridgeline.co")
      .executeTakeFirst();

    if (!manager) {
      const managerUserId = uuidv4();
      const managerPasswordHash = await bcrypt.hash("logpilot", 10);

      await db
        .insertInto("User")
        .values({
          id: managerUserId,
          name: "Sarah Manager",
          email: "manager@ridgeline.co",
          passwordHash: managerPasswordHash,
          role: "FLEET_MANAGER",
          carrierId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .execute();
      console.log("✅ Created fleet manager: manager@ridgeline.co");
    } else {
      console.log("✓ Fleet manager already exists: manager@ridgeline.co");
    }

    console.log("\n🎉 Database seeded successfully!");
    console.log("\n📝 Demo Credentials:");
    console.log("  Drivers:");
    console.log("    • driver@ridgeline.co (John Driver)");
    console.log("    • ahmad@ridgeline.co (Ahmad)");
    console.log("  Fleet Manager:");
    console.log("    • manager@ridgeline.co (Sarah Manager)");
    console.log("  Password (all): logpilot");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
