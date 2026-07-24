import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/session";
import { getDriverLogs, getCarrierLogs } from "@/lib/data/logs";
import { computeStatusTotals } from "@/lib/fmcsa/calculations";
import { evaluateHos } from "@/lib/fmcsa/validation";

/**
 * GET /api/logs — paginated, filterable, sortable list of the caller's logs.
 *
 * Role-scoped: drivers see their own logs; fleet managers see every log in
 * their carrier. Validates all query params with Zod and returns typed errors.
 *
 * Query params:
 *   page, pageSize, sort=(date|miles|driving), order=(asc|desc),
 *   status=(all|certified|draft), q=<search>
 */
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(["date", "miles", "driving"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["all", "certified", "draft"]).default("all"),
  q: z.string().trim().max(120).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { page, pageSize, sort, order, status, q } = parsed.data;

  try {
    const allLogs =
      user.role === "DRIVER" && user.driverId
        ? await getDriverLogs(user.driverId)
        : user.carrierId
          ? await getCarrierLogs(user.carrierId)
          : [];

    let logs = [...allLogs];

    if (status !== "all") {
      logs = logs.filter((l) => (status === "certified" ? l.certified : !l.certified));
    }
    if (q) {
      const needle = q.toLowerCase();
      logs = logs.filter((l) =>
        [l.header.date, l.header.commodity, l.header.shippingNumber, l.header.truckNumber, l.header.driverName]
          .filter(Boolean)
          .some((f) => f!.toLowerCase().includes(needle)),
      );
    }

    const dir = order === "asc" ? 1 : -1;
    logs.sort((a, b) => {
      if (sort === "date") return dir * a.header.date.localeCompare(b.header.date);
      if (sort === "miles") return dir * ((a.header.totalMiles ?? 0) - (b.header.totalMiles ?? 0));
      return dir * (computeStatusTotals(a.segments).D - computeStatusTotals(b.segments).D);
    });

    const total = logs.length;
    const start = (page - 1) * pageSize;
    const pageItems = logs.slice(start, start + pageSize).map((l) => {
      const totals = computeStatusTotals(l.segments);
      const snapshot = evaluateHos(l, allLogs, l.cycle);
      return {
        id: l.id,
        date: l.header.date,
        driver: l.header.driverName,
        truckNumber: l.header.truckNumber,
        commodity: l.header.commodity,
        totalMiles: l.header.totalMiles,
        certified: l.certified,
        totals: { drivingMinutes: totals.D, onDutyMinutes: totals.onDuty },
        complianceScore: snapshot.complianceScore,
        violations: snapshot.violations.length,
      };
    });

    return NextResponse.json({
      data: pageItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        hasNext: start + pageSize < total,
        hasPrev: page > 1,
      },
      meta: { role: user.role, sort, order, status, q: q ?? null },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load logs", detail: (err as Error).message },
      { status: 500 },
    );
  }
}
