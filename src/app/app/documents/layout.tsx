import type { ReactNode } from "react";
import { DocumentSidebar } from "@/components/layout/document-sidebar";

export default function DocumentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="input-shell">
      <DocumentSidebar />
      <div className="input-content">{children}</div>
    </div>
  );
}
