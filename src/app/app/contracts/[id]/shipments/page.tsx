import { redirect } from "next/navigation";

export default async function LegacyContractShipmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/app/contracts/${id}/execution/bookings`);
}
