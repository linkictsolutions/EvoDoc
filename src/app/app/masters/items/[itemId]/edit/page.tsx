import { redirect } from "next/navigation";

export default async function EditItemPage({ params }: { params: Promise<{ itemId: string }> }) {
  await params;

  redirect("/app/masters/customers");
}
