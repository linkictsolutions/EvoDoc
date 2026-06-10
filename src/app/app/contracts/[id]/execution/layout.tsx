import type { ReactNode } from "react";
import { ExecutionSubnav } from "@/components/layout/contract-workspace-nav";

export default async function ContractExecutionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="workspace-section-stack">
      <ExecutionSubnav contractId={id} />
      {children}
    </div>
  );
}
