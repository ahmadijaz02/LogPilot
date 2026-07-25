import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

interface UserTable {
  id: string;
  email: string;
  carrierId: string | null;
}

interface CarrierTable {
  id: string;
  name: string;
}

interface DriverTable {
  id: string;
  userId: string;
  carrierId: string | null;
}

interface Database {
  User: UserTable;
  Carrier: CarrierTable;
  Driver: DriverTable;
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

async function fixUserCarrier() {
  try {
    console.log("🔧 Fixing user carrier assignment...\n");

    // Get Ridgeline Transportation carrier
    const carrier = await db
      .selectFrom("Carrier")
      .selectAll()
      .where("name", "=", "Ridgeline Transportation")
      .executeTakeFirst();

    if (!carrier) {
      console.error("❌ Ridgeline Transportation carrier not found!");
      process.exit(1);
    }

    // Get ahmad@gmail.com user
    const user = await db
      .selectFrom("User")
      .selectAll()
      .where("email", "=", "ahmad@gmail.com")
      .executeTakeFirst();

    if (!user) {
      console.error("❌ ahmad@gmail.com user not found!");
      process.exit(1);
    }

    console.log(`📧 Found user: ${user.email}`);
    console.log(`   Current carrier: ${user.carrierId || "None"}`);
    console.log(`   Target carrier: ${carrier.id} (${carrier.name})\n`);

    // Update User to assign carrier
    await db
      .updateTable("User")
      .set({ carrierId: carrier.id })
      .where("id", "=", user.id)
      .execute();

    // Update Driver to assign carrier
    await db
      .updateTable("Driver")
      .set({ carrierId: carrier.id })
      .where("userId", "=", user.id)
      .execute();

    console.log("✅ Updated User carrier assignment");
    console.log("✅ Updated Driver carrier assignment");
    console.log("\n🎉 Fixed! ahmad@gmail.com is now in Ridgeline Transportation");
    console.log("   The fleet manager should now see this driver in the fleet overview");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixUserCarrier();
