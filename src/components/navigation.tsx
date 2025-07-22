import { FileText, Home, Plus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { NFCStatusIndicator } from "@/components/status";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/window-controls";

export function Navigation() {
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: Home,
    },
    {
      path: "/writer",
      label: "Create Cartridge",
      icon: Plus,
    },
    {
      path: "/logs",
      label: "Logs",
      icon: FileText,
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-8 bg-background border-b flex items-center p-1 drag-region">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 text-xs rounded-sm"
                  asChild
                >
                  <Link key={item.path} to={item.path} className="no-drag">
                    <Icon className="size-3" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <NFCStatusIndicator />
          <WindowControls />
        </div>
      </div>
    </nav>
  );
}
