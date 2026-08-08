import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  adminOnly?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export type AppRoute = {
  path: string;
  label: string;
};
