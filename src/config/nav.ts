import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarRange,
  History,
  BarChart3,
  FileText,
  Truck,
  Building2,
  UserRound,
  Settings,
  Users,
} from "lucide-react";

export type Role = "DRIVER" | "FLEET_MANAGER";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  shortcut?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Driver",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["DRIVER"], shortcut: "G D" },
      { title: "Daily Log", href: "/log", icon: ClipboardList, roles: ["DRIVER"], shortcut: "G L" },
      { title: "Weekly View", href: "/weekly", icon: CalendarRange, roles: ["DRIVER"], shortcut: "G W" },
      { title: "History", href: "/history", icon: History, roles: ["DRIVER"], shortcut: "G H" },
      { title: "Analytics", href: "/analytics", icon: BarChart3, roles: ["DRIVER"] },
      { title: "Reports", href: "/reports", icon: FileText, roles: ["DRIVER"] },
    ],
  },
  {
    label: "Fleet Manager",
    items: [
      { title: "Fleet Overview", href: "/fleet", icon: Users, roles: ["FLEET_MANAGER"] },
      { title: "Manage Drivers", href: "/fleet/drivers", icon: UserRound, roles: ["FLEET_MANAGER"] },
      { title: "Analytics", href: "/fleet/analytics", icon: BarChart3, roles: ["FLEET_MANAGER"] },
      { title: "Reports", href: "/fleet/reports", icon: FileText, roles: ["FLEET_MANAGER"] },
      { title: "Carrier Settings", href: "/fleet/settings", icon: Building2, roles: ["FLEET_MANAGER"] },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Driver Profile", href: "/profile", icon: UserRound, roles: ["DRIVER"] },
      { title: "Settings", href: "/settings", icon: Settings, roles: ["DRIVER", "FLEET_MANAGER"] },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export const ROLE_LABELS: Record<Role, string> = {
  DRIVER: "Driver",
  FLEET_MANAGER: "Fleet Manager",
};

// Icon retained for potential fleet vehicle views.
export const FleetIcon = Truck;
