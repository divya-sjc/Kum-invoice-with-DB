import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
        {/* Sidebar and main content will be rendered here */}
        <Outlet />
      </div>
    </SidebarProvider>
  );
}
