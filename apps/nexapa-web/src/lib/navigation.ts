import {
  LayoutDashboard,
  Download,
  Library,
  Link2,
  Send,
  CalendarClock,
  BadgePercent,
  Clock3,
  Settings,
  Code2,
  ShoppingBag,
} from "lucide-react";
import type { NavGroup } from "@/types/navigation";

export const navigationGroups: NavGroup[] = [
  {
    title: "Workspace",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Workflow overview",
      },
      {
        label: "Downloader",
        href: "/downloader",
        icon: Download,
        description: "Collect and normalize media",
      },
      {
        label: "Media Library",
        href: "/library",
        icon: Library,
        description: "Curated media assets",
      },
    ],
  },
  {
    title: "Publishing",
    items: [
      {
        label: "Connected Accounts",
        href: "/accounts",
        icon: Link2,
        description: "Channel connections",
      },
      {
        label: "Publisher",
        href: "/publisher",
        icon: Send,
        description: "Create and publish",
      },
      {
        label: "Scheduler",
        href: "/scheduler",
        icon: CalendarClock,
        description: "Timed publishing",
      },
    ],
  },
  {
    title: "Commerce",
    items: [
      {
        label: "Affiliate",
        href: "/affiliate",
        icon: BadgePercent,
        description: "Affiliate catalog & links",
      },
      {
        label: "Shopee",
        href: "/shopee",
        icon: ShoppingBag,
        description: "Shopee Video & affiliate workspace",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        label: "History",
        href: "/history",
        icon: Clock3,
        description: "Activity timeline",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Manage your personal profile and account",
      },
      {
        label: "Developer",
        href: "/developer-settings",
        icon: Code2,
        description: "Platform integrations, API credentials, and system configuration",
        adminOnly: true,
      },
    ],
  },
];

export const allNavItems = navigationGroups.flatMap((g) => g.items);

export const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/downloader": "Downloader",
  "/library": "Media Library",
  "/accounts": "Connected Accounts",
  "/publisher": "Publisher",
  "/scheduler": "Scheduler",
  "/affiliate": "Affiliate",
  "/shopee": "Shopee",
  "/history": "History",
  "/settings": "Settings",
  "/settings/appearance": "Appearance",
  "/developer-settings": "Developer",
  "/login": "Sign In",
  "/profile": "User Profile",
  "/inbox": "Inbox",
};
