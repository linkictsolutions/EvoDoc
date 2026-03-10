import { redirect } from "next/navigation";

export default async function LegacyResolvedValuesPage(
  { searchParams }: { searchParams: Promise<{ contractId?: string }> },
) {
  const { contractId } = await searchParams;

  if (contractId) {
    redirect(`/app/contracts/${contractId}/resolved-values`);
  }

  redirect("/app/contracts");
}
