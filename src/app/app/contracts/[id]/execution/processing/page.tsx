import { ProcessingPage } from "@/components/execution/processing-page";

export default async function ContractProcessingExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProcessingPage contractId={id} />;
}
