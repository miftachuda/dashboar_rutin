import { useState } from "react";
import Sidebar from "./SideBar";
import Header from "./Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />

        <main className="flex-1 overflow-auto p-0">{children}</main>
      </div>
    </div>
  );
}
