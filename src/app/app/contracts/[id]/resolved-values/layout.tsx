import type { ReactNode } from "react";
import { SourceDocumentsSubnav } from "@/components/layout/contract-workspace-nav";

export default async function ContractResolvedValuesLayout(
  { children, params }: { children: ReactNode; params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <div className="workspace-section-stack">
      <SourceDocumentsSubnav contractId={id} />
      {children}
    </div>
  );
}
