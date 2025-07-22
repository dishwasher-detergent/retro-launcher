import { ReactNode } from "react";

import { Navigation } from "@/components/navigation";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen dark bg-background">
      <Navigation />
      <main className="pt-10 px-4 pb-4 text-foreground">{children}</main>
    </div>
  );
}
