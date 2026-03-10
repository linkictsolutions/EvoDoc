import { ContractSiLcReportView } from "@/components/reports/contract-si-lc-report";

export default async function ContractResolvedValuesPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return <ContractSiLcReportView initialContractId={id} />;
}
