import type { ReactNode } from "react";
import { ContractEditSidebar } from "@/components/layout/contract-edit-sidebar";

export default async function ContractInputsLayout(
  { children, params }: { children: ReactNode; params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <div className="input-shell">
      <ContractEditSidebar contractId={id} />
      <div className="input-content">{children}</div>
    </div>
  );
}
