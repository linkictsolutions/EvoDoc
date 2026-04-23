import { ItemFormPage } from "@/components/masters/item-form-page";

export default async function EditItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;

  return <ItemFormPage itemId={itemId} />;
}
