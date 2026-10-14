
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="admin-shell">
      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />

      <div className="admin-main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="admin-content">
          <Outlet />
        </main>

        <footer className="admin-footer">
          <span>thebabycowboy</span>
          <span>Personal Admin Studio</span>
        </footer>
      </div>
    </div>
  );
}
