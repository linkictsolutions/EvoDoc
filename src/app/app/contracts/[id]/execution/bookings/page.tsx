import { BookingsPage } from "@/components/execution/bookings-page";

export default async function ContractBookingsExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingsPage contractId={id} />;
}
