import { LucideFileText, LucideHome, LucidePlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { StatusIndicator } from "@/components/status";
import { Button } from "@/components/ui/button";
import { WindowControls } from "@/components/window-controls";

export function Navigation() {
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: LucideHome,
    },
    {
      path: "/writer",
      label: "New Cartridge",
      icon: LucidePlus,
    },
    {
      path: "/logs",
      label: "Logs",
      icon: LucideFileText,
    },
  ];

  return (
    <nav className="flex-none h-8 bg-background border-b flex items-center p-1 drag-region">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1">
          <img
            src="retro_launcher.png"
            alt="Reto Launcher"
            className="size-6"
          />
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Button
                key={item.path}
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
        <div className="flex items-center space-x-3">
          <StatusIndicator />
          <WindowControls />
        </div>
      </div>
    </nav>
  );
}
