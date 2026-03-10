import { BankLcForm } from "@/components/forms/bank-lc-form";

export default async function ContractInputsBankLcPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <BankLcForm
      initialContractId={id}
      autoLoadExisting
      continueHref={`/app/contracts/${id}/inputs/contract-si-lc`}
    />
  );
}
