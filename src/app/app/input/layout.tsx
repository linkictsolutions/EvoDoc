import type { ReactNode } from "react";
import { InputSidebar } from "@/components/layout/input-sidebar";

export default function InputLayout({ children }: { children: ReactNode }) {
  return (
    <div className="input-shell">
      <InputSidebar />
      <div className="input-content">{children}</div>
    </div>
  );
}
