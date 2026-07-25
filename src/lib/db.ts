import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export interface CarrierTable {
  id: string;
  name: string;
  mainOffice: string | null;
  homeTerminal: string | null;
  dotNumber: string | null;
  createdAt: Date;
}

export interface UserTable {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "DRIVER" | "FLEET_MANAGER";
  carrierId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DriverTable {
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

export interface DailyLogTable {
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

export interface DutyEntryTable {
  id: string;
  logId: string;
  status: "OFF" | "SB" | "D" | "ON";
  startMin: number;
  endMin: number;
  location: string | null;
  remark: string | null;
}

export interface RemarkTable {
  id: string;
  logId: string;
  timeMin: number;
  location: string;
  note: string | null;
}

export interface ShippingDocTable {
  id: string;
  logId: string;
  proNumber: string | null;
  shipper: string | null;
  commodity: string | null;
}

export interface Database {
  Carrier: CarrierTable;
  User: UserTable;
  Driver: DriverTable;
  DailyLog: DailyLogTable;
  DutyEntry: DutyEntryTable;
  Remark: RemarkTable;
  ShippingDoc: ShippingDocTable;
}

const globalForKysely = globalThis as unknown as { db?: Kysely<Database> };

export const db =
  globalForKysely.db ??
  new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
        // Serverless: every warm instance keeps its own pool, and the Supabase
        // pooler caps total clients. Keep this tiny so N instances stay under it.
        max: 3,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      }),
    }),
  });

globalForKysely.db = db;
