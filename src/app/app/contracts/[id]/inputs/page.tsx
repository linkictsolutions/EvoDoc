import { redirect } from "next/navigation";

export default async function ContractInputsIndexPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  redirect(`/app/contracts/${id}/inputs/contract`);
}
