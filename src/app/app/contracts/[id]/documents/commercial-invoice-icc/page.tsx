import { CommercialInvoiceIccSampleView } from "@/components/reports/commercial-invoice-icc-sample";

export default async function ContractCommercialInvoiceIccPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return <CommercialInvoiceIccSampleView initialContractId={id} />;
}
