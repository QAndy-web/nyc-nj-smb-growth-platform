"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAVIGATION = [
  { href: "/dashboard", label: "Dashboard", caption: "Command center" },
  { href: "/pipeline", label: "Lead Pipeline", caption: "Discover to close" },
  { href: "/agents", label: "Agents", caption: "Jobs and review gates" },
  { href: "/projects", label: "Projects", caption: "Delivery tracker" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="appFrame">
      <aside className="appSidebar">
        <Link className="sidebarBrand" href="/dashboard" aria-label="Local Business Growth OS dashboard">
          <span className="brandMark" aria-hidden="true"><span>NY</span><span>NJ</span></span>
          <span><strong>Growth OS</strong><small>Local business platform</small></span>
        </Link>
        <nav className="appNav" aria-label="Primary navigation">
          {NAVIGATION.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <Link className={active ? "navActive" : ""} href={item.href} key={item.href}><strong>{item.label}</strong><small>{item.caption}</small></Link>;
          })}
        </nav>
        <div className="reviewGuard"><span>Human review on</span><p>Demo sharing and outreach sending stay manual.</p></div>
      </aside>
      <div className="appMain">{children}</div>
    </div>
  );
}
