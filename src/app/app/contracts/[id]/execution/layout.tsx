import type { ReactNode } from "react";

export default async function ContractExecutionLayout({
  children,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  return children;
}
