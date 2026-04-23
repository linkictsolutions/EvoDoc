import { redirect } from "next/navigation";

export default async function LegacyShipmentPage({
  params,
}: {
  params: Promise<{ id: string; shipmentId: string }>;
}) {
  const { id } = await params;
  redirect(`/app/contracts/${id}/execution/bookings`);
}
