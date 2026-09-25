"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileMenuButton({ children }: { children: React.ReactNode }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button variant="outline" onClick={toggleSidebar} className="h-11 gap-2 px-4 text-base">
      {children}
    </Button>
  );
}
