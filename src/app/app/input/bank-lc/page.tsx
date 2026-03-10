import { redirect } from "next/navigation";

export default async function LegacyBankLcInputPage(
  { searchParams }: { searchParams: Promise<{ contractId?: string }> },
) {
  const { contractId } = await searchParams;

  if (contractId) {
    redirect(`/app/contracts/${contractId}/inputs/bank-lc`);
  }

  redirect("/app/contracts");
}
