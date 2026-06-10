import type { ReactNode } from "react";

export default async function ContractWorkspaceLayout(
  { children }: { children: ReactNode; params: Promise<{ id: string }> },
) {
  return children;
}
