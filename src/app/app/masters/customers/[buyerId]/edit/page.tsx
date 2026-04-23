import { BuyerFormPage } from "@/components/masters/buyer-form-page";

export default async function EditBuyerPage({ params }: { params: Promise<{ buyerId: string }> }) {
  const { buyerId } = await params;

  return <BuyerFormPage buyerId={buyerId} />;
}
