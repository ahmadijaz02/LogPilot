import type { Role } from "@/config/nav";

export interface ShellUser {
  name: string;
  email: string;
  role: Role;
  initials: string;
}

export function toInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
