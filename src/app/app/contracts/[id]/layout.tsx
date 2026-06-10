import type { ReactNode } from "react";
import { ContractWorkspaceFrame } from "@/components/layout/contract-workspace-nav";

export default async function ContractWorkspaceLayout(
  { children, params }: { children: ReactNode; params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <ContractWorkspaceFrame contractId={id}>
      {children}
    </ContractWorkspaceFrame>
  );
}
