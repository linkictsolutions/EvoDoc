import { ShippingInstructionForm } from "@/components/forms/shipping-instruction-form";

export default async function ContractInputsShippingPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <ShippingInstructionForm
      initialContractId={id}
      autoLoadExisting
      continueHref={`/app/contracts/${id}/inputs/bank-lc`}
    />
  );
}
