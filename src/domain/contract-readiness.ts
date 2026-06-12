import type { Contract } from "@/types/models";

export function getMissingSourceSteps(contract: Contract): string[] {
  const missing: string[] = [];

  if (!contract.terms?.quality?.trim() || !contract.terms?.quantityBags) {
    missing.push("Contract");
  }

  if (
    !contract.shipping?.destinationPort?.trim()
    || !contract.shipping?.portOfLoading?.trim()
    || !contract.shipping?.shippingLine?.trim()
  ) {
    missing.push("Shipping Instruction");
  }

  if (!contract.banking?.lcNumber?.trim() && !contract.banking?.beneficiaryBank?.trim()) {
    missing.push("Bank & LC");
  }

  return missing;
}

export function getSourceDocumentProgress(contract: Contract) {
  const steps = [
    {
      key: "contract",
      label: "Contract",
      complete: Boolean(contract.terms?.quality?.trim() && contract.terms?.quantityBags),
      hrefSuffix: "inputs/contract",
    },
    {
      key: "shipping",
      label: "Shipping Instruction",
      complete: Boolean(
        contract.shipping?.destinationPort?.trim()
        && contract.shipping?.portOfLoading?.trim()
        && contract.shipping?.shippingLine?.trim(),
      ),
      hrefSuffix: "inputs/shipping-instruction",
    },
    {
      key: "bank",
      label: "Bank & LC",
      complete: Boolean(contract.banking?.lcNumber?.trim() || contract.banking?.beneficiaryBank?.trim()),
      hrefSuffix: "inputs/bank-lc",
    },
    {
      key: "bol",
      label: "Bill of Lading",
      complete: Boolean(contract.billOfLading?.movementType?.trim() && contract.billOfLading?.freightParty?.trim()),
      hrefSuffix: "inputs/bill-of-lading",
    },
  ] as const;

  const completed = steps.filter((step) => step.complete).length;

  return {
    steps,
    completed,
    total: steps.length,
  };
}
