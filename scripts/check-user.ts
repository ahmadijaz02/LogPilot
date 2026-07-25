import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

interface UserTable {
  id: string;
  name: string;
  email: string;
  role: "DRIVER" | "FLEET_MANAGER";
  carrierId: string | null;
  createdAt: Date;
}

interface DriverTable {
  id: string;
  userId: string;
  carrierId: string | null;
}

interface CarrierTable {
  id: string;
  name: string;
}

interface Database {
  User: UserTable;
  Driver: DriverTable;
  Carrier: CarrierTable;
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

async function checkUsers() {
  try {
    console.log("🔍 Checking all users in database...\n");

    const users = await db
      .selectFrom("User")
      .leftJoin("Driver", "Driver.userId", "User.id")
      .leftJoin("Carrier", "Carrier.id", "User.carrierId")
      .select([
        "User.id",
        "User.name",
        "User.email",
        "User.role",
        "Carrier.name as carrierName",
        "Driver.id as driverId",
      ])
      .orderBy("User.createdAt", "desc")
      .execute();

    if (users.length === 0) {
      console.log("No users found!");
    } else {
      console.log("📋 All Users:");
      console.log("─".repeat(100));
      for (const user of users) {
        console.log(
          `📧 ${user.email}`
        );
        console.log(
          `   Name: ${user.name} | Role: ${user.role}`
        );
        console.log(
          `   Carrier: ${(user as any).carrierName || "None"} | Driver ID: ${(user as any).driverId ? "✓" : "✗"}`
        );
        console.log();
      }
    }

    console.log("─".repeat(100));
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkUsers();
