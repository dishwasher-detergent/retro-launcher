import { ReactNode } from "react";

import { Navigation } from "@/components/navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen w-screen dark bg-background overflow-hidden flex flex-col">
      <Navigation />
      <main className="p-4 text-foreground overflow-auto flex-1">
        {children}
      </main>
    </div>
  );
}
