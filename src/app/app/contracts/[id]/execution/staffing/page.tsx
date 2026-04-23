import { StaffingPage } from "@/components/execution/staffing-page";

export default async function ContractStaffingExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StaffingPage contractId={id} />;
}
