import { amountToWords } from "@/domain/amount-words";
import { computeContractExcelParity, resolveContractSiLcFinalFields } from "@/domain/excel-parity";
import { formatMoney, formatWeight } from "@/domain/rounding";
import type {
  DocumentInputSnapshot,
  DocumentOutputSnapshot,
  DocumentType,
} from "@/types/models";

function sellerIdentity() {
  return "PRAXIS INTERNATIONAL BUSINESS PLC, NIFAS SILK LAFTO SUB CITY, WOREDA 08, HOUSE NO 1986, ADDIS ABABA, ETHIOPIA";
}

export function mapDocumentOutput(
  docType: DocumentType,
  snapshot: DocumentInputSnapshot,
): DocumentOutputSnapshot {
  const parity = computeContractExcelParity(snapshot.contract.terms);
  const finalFields = resolveContractSiLcFinalFields(snapshot, parity);
  const invoiceVariant = snapshot.docVariant ?? "final";

  const sharedTotals = {
    totalBags: finalFields.noOfBags,
    totalNetWeight: formatWeight(parity.quantityKg),
    totalGrossWeight: formatWeight(parity.grossWeightKg),
    totalNetWeightMt: `${parity.quantityMt.toFixed(3)} MT`,
    totalAmount: formatMoney(parity.totalPrice, snapshot.contract.terms.currency),
  };

  switch (docType) {
    case "invoice":
      if (invoiceVariant === "permit") {
        return {
          docType,
          docVariant: invoiceVariant,
          title: "Commercial Invoice - Permit",
          sections: [
            {
              heading: "Parties and Banking",
              rows: [
                { label: "Shipper", value: sellerIdentity() },
                { label: "Applicant", value: finalFields.applicant },
                { label: "Contract Ref", value: snapshot.contract.contractNumber },
                {
                  label: "Contract Date",
                  value: new Date(snapshot.contract.createdAt).toISOString().slice(0, 10),
                },
                { label: "Payment Term", value: finalFields.paymentTerm },
                { label: "LC Number", value: snapshot.contract.banking.lcNumber ?? "-" },
                { label: "Delivery Term", value: finalFields.deliveryTerm },
                { label: "Port of Loading", value: finalFields.portOfLoading },
                { label: "Port of Discharge", value: finalFields.destination },
                { label: "Final Destination", value: finalFields.destination },
                { label: "Bank of Beneficiary", value: snapshot.contract.banking.beneficiaryBank ?? "-" },
                { label: "Beneficiary Bank Address", value: snapshot.contract.banking.bankAddress ?? "-" },
                { label: "SWIFT Number", value: snapshot.contract.banking.receiver ?? "-" },
                { label: "Beneficiary Account Number", value: snapshot.contract.banking.beneficiaryAccountNumber ?? "-" },
              ],
            },
            {
              heading: "Goods and Amount",
              rows: [
                { label: "HS Code", value: "09011100" },
                { label: "Packaging & Marking", value: finalFields.bagMarking },
                { label: "Description", value: finalFields.description },
                { label: "Quantity (LB)", value: parity.quantityLb.toFixed(3) },
                { label: "Net Weight (KG)", value: parity.quantityKg.toFixed(3) },
                { label: "Gross Weight (KG)", value: parity.grossWeightKg.toFixed(3) },
                { label: "No of Bags", value: finalFields.noOfBags },
                { label: "Unit Price", value: snapshot.contract.terms.unitPrice.toFixed(2) },
                { label: "Total Price", value: formatMoney(parity.totalPrice, snapshot.contract.terms.currency) },
                { label: "Amount in Words", value: amountToWords(parity.totalPrice, snapshot.contract.terms.currency) },
                { label: "Full Marking", value: finalFields.bagMarking },
              ],
            },
          ],
          totals: sharedTotals,
        };
      }

      return {
        docType,
        docVariant: invoiceVariant,
        title: "Commercial Invoice - Final",
        sections: [
          {
            heading: "Parties and Reference",
            rows: [
              { label: "Shipper", value: sellerIdentity() },
              { label: "Applicant", value: finalFields.applicant },
              { label: "Contract Ref", value: snapshot.contract.contractNumber },
              {
                label: "Contract Date",
                value: new Date(snapshot.contract.createdAt).toISOString().slice(0, 10),
              },
            ],
          },
          {
            heading: "Commercial Terms",
            rows: [
              { label: "Payment Term", value: finalFields.paymentTerm },
              { label: "Delivery Term", value: finalFields.deliveryTerm },
              { label: "Port of Loading", value: finalFields.portOfLoading },
              { label: "Destination", value: finalFields.destination },
              { label: "Description", value: finalFields.description },
              { label: "Bag Marking", value: finalFields.bagMarking },
            ],
          },
          {
            heading: "Weights and Price",
            rows: [
              { label: "No of Bags", value: finalFields.noOfBags },
              { label: "Quantity (LB)", value: parity.quantityLb.toFixed(3) },
              { label: "Net Weight (KG)", value: parity.quantityKg.toFixed(3) },
              { label: "Gross Weight (KG)", value: parity.grossWeightKg.toFixed(3) },
              { label: "Unit Price", value: snapshot.contract.terms.unitPrice.toFixed(2) },
              {
                label: "Total Price",
                value: formatMoney(parity.totalPrice, snapshot.contract.terms.currency),
              },
              {
                label: "Amount in Words",
                value: amountToWords(parity.totalPrice, snapshot.contract.terms.currency),
              },
            ],
          },
        ],
        totals: sharedTotals,
      };

    case "packing_list":
      return {
        docType,
        docVariant: "standard",
        title: "Packing List",
        sections: [
          {
            heading: "Shipment Overview",
            rows: [
              { label: "Shipper", value: sellerIdentity() },
              { label: "Applicant", value: finalFields.applicant },
              { label: "Consignee", value: finalFields.consignee },
              { label: "Contract Ref", value: snapshot.contract.contractNumber },
              { label: "Vessel", value: snapshot.shipment.vessel ?? "-" },
              { label: "Voyage", value: snapshot.shipment.voyageNo ?? "-" },
              { label: "Booking Number", value: snapshot.contract.shipping.bookingNumber ?? "-" },
            ],
          },
          {
            heading: "Cargo Details",
            rows: [
              { label: "Description", value: finalFields.description },
              { label: "No of Bags", value: finalFields.noOfBags },
              { label: "Container Count", value: String(parity.containerCount) },
              {
                label: "Bags per Container",
                value: (parity.noOfBags / parity.containerCount).toFixed(3),
              },
              { label: "Gross Weight (MT)", value: parity.grossWeightMt.toFixed(3) },
              { label: "Net Weight (MT)", value: parity.quantityMt.toFixed(3) },
            ],
          },
          {
            heading: "Processing",
            rows: [
              { label: "Station", value: snapshot.contract.processing.stationName },
              { label: "Address", value: snapshot.contract.processing.stationAddress },
              {
                label: "Moisture",
                value: `${snapshot.contract.processing.moisturePercent.toFixed(2)}%`,
              },
            ],
          },
        ],
        totals: sharedTotals,
      };

    case "shipping_instructions":
      return {
        docType,
        docVariant: "standard",
        title: "Shipping Instructions",
        sections: [
          {
            heading: "Parties",
            rows: [
              { label: "Shipper", value: sellerIdentity() },
              { label: "Consignee", value: finalFields.consignee },
              { label: "Notify", value: finalFields.notify },
              { label: "Second Notify", value: finalFields.secondNotify },
            ],
          },
          {
            heading: "Shipping Terms",
            rows: [
              { label: "Shipping Line", value: finalFields.shippingLine },
              { label: "Alternative 1", value: finalFields.alternative1 },
              { label: "Alternative 2", value: finalFields.alternative2 },
              { label: "Port of Loading", value: finalFields.portOfLoading },
              { label: "Destination", value: finalFields.destination },
              { label: "Booking Number", value: snapshot.contract.shipping.bookingNumber ?? "-" },
            ],
          },
          {
            heading: "Cargo and Weights",
            rows: [
              { label: "Description", value: finalFields.description },
              {
                label: "Quantity",
                value: `${snapshot.contract.terms.quantityBags} BAGS (${parity.containerCount}*20)`,
              },
              { label: "Gross Weight (KG)", value: parity.grossWeightKg.toFixed(3) },
              { label: "Net Weight (KG)", value: parity.quantityKg.toFixed(3) },
              { label: "Cert No", value: finalFields.certNo },
            ],
          },
        ],
        totals: sharedTotals,
      };

    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}
