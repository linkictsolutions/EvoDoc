import type { ReactNode } from "react";
import { ContractWorkspaceNav } from "@/components/layout/contract-workspace-nav";

export default async function ContractWorkspaceLayout(
  { children, params }: { children: ReactNode; params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <div className="page-shell">
      <ContractWorkspaceNav contractId={id} />
      {children}
    </div>
  );
}
