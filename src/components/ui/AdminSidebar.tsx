"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  CreditCard,
  Plug,
  LogOut,
  GraduationCap,
  CalendarDays,
  UserCheck,
  ClipboardCheck,
  Package,
  Tag,
  Menu,
  X,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/programs", label: "Programs", icon: BookOpen },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
];

const facilitatorNav: NavItem[] = [
  { href: "/facilitator", label: "My classes", icon: CalendarDays },
];

const learnNav: NavItem[] = [
  { href: "/learn", label: "My classes", icon: GraduationCap },
];

const superAdminNav: NavItem[] = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/tenants", label: "Tenants", icon: Users },
  { href: "/superadmin/plans", label: "Plans", icon: Package },
  { href: "/superadmin/coupons", label: "Coupons", icon: Tag },
  { href: "/superadmin/users", label: "Users", icon: UserCheck },
  { href: "/superadmin/billing", label: "Billing", icon: CreditCard },
  { href: "/superadmin/settings", label: "Settings", icon: Settings },
];

type Props = {
  variant: "admin" | "facilitator" | "learn" | "superadmin";
  user?: { fullName: string; role: string };
  churchName?: string;
  /** Church logo URL for tenant branding (admin, facilitator, learn variants). */
  logoUrl?: string | null;
  /** When false, Integrations nav item is greyed out (admin variant only). Default true when omitted. */
  integrationsEnabled?: boolean;
  /** Church primary color for sidebar background when custom branding is enabled. */
  primaryColor?: string | null;
  /** Church secondary color for sidebar link hover highlight. */
  secondaryColor?: string | null;
  /** Admin-selectable color for sidebar link text on hover. */
  linkColor?: string | null;
};

export default function AdminSidebar({ variant, user, churchName, logoUrl, integrationsEnabled = true, primaryColor, secondaryColor, linkColor }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = variant === "admin" ? adminNav : variant === "facilitator" ? facilitatorNav : variant === "learn" ? learnNav : superAdminNav;

  const closeDrawer = () => setMobileOpen(false);

  const isIntegrationsDisabled = variant === "admin" && !integrationsEnabled;

  const effectiveLinkColor = linkColor ?? secondaryColor ?? "#a78bfa";
  const hoverBgColor = secondaryColor ? `${secondaryColor}26` : "rgba(255,255,255,0.1)";
  const sidebarStyle = {
    backgroundColor: primaryColor ?? "#1a1a2e",
    "--sidebar-hover-bg": hoverBgColor,
    "--sidebar-link-color": effectiveLinkColor,
  } as React.CSSProperties;

  return (
    <>
      {/* Mobile header bar with hamburger - visible only on mobile */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-40 border-b border-white/10"
        style={{ backgroundColor: primaryColor ?? "#1a1a2e" }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href={variant === "superadmin" ? "/superadmin" : variant === "admin" ? "/admin" : variant === "facilitator" ? "/facilitator" : variant === "learn" ? "/learn" : "/"} className="flex items-center gap-1" onClick={closeDrawer}>
          {logoUrl ? (
            <img src={logoUrl} alt={churchName ?? "Logo"} className="h-8 object-contain" />
          ) : (
            <>
              <span className="font-heading text-xl font-bold text-white">Kyston</span>
              <span className="text-secondary font-bold text-xl"> LMS</span>
            </>
          )}
        </Link>
        <div className="w-10" />
      </header>

      {/* Overlay when drawer is open - mobile only */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeDrawer}
        aria-hidden={!mobileOpen}
      />

      {/* Sidebar - drawer on mobile, fixed on desktop */}
      <aside
        className={`w-64 min-h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-200 ease-out
          -translate-x-full md:translate-x-0
          ${mobileOpen ? "translate-x-0" : ""}
        `}
        style={sidebarStyle}
      >
        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-col">
            <Link href={variant === "superadmin" ? "/superadmin" : variant === "admin" ? "/admin" : variant === "facilitator" ? "/facilitator" : variant === "learn" ? "/learn" : "/"} className="flex items-center gap-2" onClick={closeDrawer}>
              {logoUrl ? (
                <img src={logoUrl} alt={churchName ?? "Logo"} className="h-10 object-contain" />
              ) : (
                <>
                  <span className="font-heading text-2xl font-bold text-white">Kyston</span>
                  <span className="text-secondary font-bold text-2xl"> LMS</span>
                </>
              )}
            </Link>
            {churchName && (
              <p className="text-neutral-content/60 text-xs font-body mt-1 truncate">{churchName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const isIntegrationsItem = item.href === "/admin/integrations";
            const disabled = isIntegrationsItem && isIntegrationsDisabled;
            const isActive = !disabled && (pathname === item.href || (item.href !== "/admin" && item.href !== "/facilitator" && item.href !== "/learn" && item.href !== "/superadmin" && pathname.startsWith(item.href)));
            const baseClass = `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[44px]`;
            const activeClass = isActive ? "bg-primary/20 border-l-4 border-secondary [color:var(--sidebar-link-color)]" : "text-neutral-content/70 hover:bg-[var(--sidebar-hover-bg)] [&:hover]:text-[var(--sidebar-link-color)]";
            const disabledClass = "opacity-50 cursor-not-allowed text-neutral-content/50 pointer-events-none";
            const className = `${baseClass} ${disabled ? disabledClass : activeClass}`;
            if (disabled) {
              return (
                <span
                  key={item.href}
                  className={className}
                  title="Not included in your plan"
                  aria-disabled
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-body text-sm font-medium">{item.label}</span>
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeDrawer}
                className={className}
              >
                <Icon className="w-5 h-5 shrink-0 transition-colors [color:inherit]" />
                <span className="font-body text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl min-h-[44px]">
              <div className="avatar placeholder">
                <div className="w-8 rounded-full bg-secondary text-secondary-content text-xs font-body flex items-center justify-center">
                  {user.fullName.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium font-body truncate">{user.fullName}</p>
                <p className="text-neutral-content/50 text-xs font-body capitalize truncate">{user.role.replace("_", " ")}</p>
              </div>
            </div>
            <Link
              href="/login"
              onClick={closeDrawer}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-content/70 hover:bg-[var(--sidebar-hover-bg)] [&:hover]:text-[var(--sidebar-link-color)] transition-all mt-1 min-h-[44px]"
            >
              <LogOut className="w-4 h-4 [color:inherit]" />
              <span className="font-body text-sm">Sign out</span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
