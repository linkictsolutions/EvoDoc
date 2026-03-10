import { ContractCoreForm } from "@/components/forms/contract-core-form";

export default async function ContractInputsContractPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <ContractCoreForm
      initialContractId={id}
      autoLoadExisting
      continueHref={`/app/contracts/${id}/inputs/shipping-instruction`}
    />
  );
}
