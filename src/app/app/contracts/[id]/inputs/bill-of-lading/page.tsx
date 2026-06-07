import { BillOfLadingForm } from "@/components/forms/bill-of-lading-form";

export default async function ContractInputsBillOfLadingPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return (
    <BillOfLadingForm
      initialContractId={id}
      autoLoadExisting
      continueHref={`/app/contracts/${id}/resolved-values`}
    />
  );
}
