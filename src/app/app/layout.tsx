import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AppSidebar>{children}</AppSidebar>
  );
}
