import { redirect } from "next/navigation";

export default async function LegacyShippingInstructionInputPage(
  { searchParams }: { searchParams: Promise<{ contractId?: string }> },
) {
  const { contractId } = await searchParams;

  if (contractId) {
    redirect(`/app/contracts/${contractId}/inputs/shipping-instruction`);
  }

  redirect("/app/contracts");
}
