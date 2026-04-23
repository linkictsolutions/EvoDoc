import type { ReactNode } from "react";

export default async function ContractInputsLayout(
  { children }: { children: ReactNode; params: Promise<{ id: string }> },
) {
  return children;
}
