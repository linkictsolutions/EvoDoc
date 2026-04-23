import { amountToWords } from "@/domain/amount-words";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { computeContractExcelParity, resolveContractSiLcFinalFields } from "@/domain/excel-parity";
import { formatMoney, formatWeight } from "@/domain/rounding";
import type {
  DocumentInputSnapshot,
  DocumentOutputSnapshot,
  DocumentType,
} from "@/types/models";

function sellerIdentity(snapshot: DocumentInputSnapshot) {
  const companyConfiguration = resolveCompanyConfiguration(
    snapshot.contract.orgId,
    snapshot.companyConfiguration,
  );

  return `${companyConfiguration.sellerName}, ${companyConfiguration.sellerAddress}`;
}

export function mapDocumentOutput(
  docType: DocumentType,
  snapshot: DocumentInputSnapshot,
): DocumentOutputSnapshot {
  const companyConfiguration = resolveCompanyConfiguration(
    snapshot.contract.orgId,
    snapshot.companyConfiguration,
  );
  const parity = computeContractExcelParity(snapshot.contract.terms, companyConfiguration);
  const finalFields = resolveContractSiLcFinalFields(snapshot, parity);
  const documentVariant = snapshot.docVariant ?? (docType === "shipping_instructions" ? "standard" : "final");
  const bookings = snapshot.executionData?.bookings;
  const staffingRows = snapshot.executionData?.staffing?.finalRows ?? [];
  const processing = snapshot.executionData?.processing ?? {
    stationName: snapshot.contract.processing.stationName,
    stationAddress: snapshot.contract.processing.stationAddress,
    moisturePercent: snapshot.contract.processing.moisturePercent,
  };

  const sharedTotals = {
    totalBags: finalFields.noOfBags,
    totalNetWeight: formatWeight(parity.quantityKg),
    totalGrossWeight: formatWeight(parity.grossWeightKg),
    totalNetWeightMt: `${parity.quantityMt.toFixed(3)} MT`,
    totalAmount: formatMoney(parity.totalPrice, snapshot.contract.terms.currency),
  };

  switch (docType) {
    case "invoice":
      if (documentVariant === "permit") {
        return {
          docType,
          docVariant: documentVariant,
          title: "Commercial Invoice - Permit",
          sections: [
            {
              heading: "Parties and Banking",
              rows: [
                { label: "Shipper", value: sellerIdentity(snapshot) },
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
                { label: "Bill of Lading", value: bookings?.billOfLadingNumber ?? "-" },
                { label: "Vessel", value: bookings?.vesselName ?? "-" },
                { label: "Voyage", value: bookings?.voyageNo ?? "-" },
                { label: "Bank of Beneficiary", value: snapshot.contract.banking.beneficiaryBank ?? "-" },
                { label: "Beneficiary Bank Address", value: snapshot.contract.banking.bankAddress ?? "-" },
                { label: "SWIFT Number", value: snapshot.contract.banking.receiver ?? "-" },
                { label: "Beneficiary Account Number", value: snapshot.contract.banking.beneficiaryAccountNumber ?? "-" },
              ],
            },
            {
              heading: "Goods and Amount",
              rows: [
                { label: "HS Code", value: companyConfiguration.defaultHsCode },
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
        docVariant: documentVariant,
        title: "Commercial Invoice - Final",
        sections: [
          {
            heading: "Parties and Reference",
            rows: [
              { label: "Shipper", value: sellerIdentity(snapshot) },
              { label: "Applicant", value: finalFields.applicant },
              { label: "Contract Ref", value: snapshot.contract.contractNumber },
              {
                label: "Contract Date",
                value: new Date(snapshot.contract.createdAt).toISOString().slice(0, 10),
              },
              { label: "Bill of Lading", value: bookings?.billOfLadingNumber ?? "-" },
              { label: "Vessel", value: bookings?.vesselName ?? "-" },
              { label: "Voyage", value: bookings?.voyageNo ?? "-" },
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
      if (documentVariant === "permit") {
        return {
          docType,
          docVariant: documentVariant,
          title: "Packing List - Permit",
          sections: [
            {
              heading: "Parties and Reference",
              rows: [
                { label: "Shipper", value: sellerIdentity(snapshot) },
                { label: "Notify", value: finalFields.notify },
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
              ],
            },
            {
              heading: "Cargo Details",
              rows: [
                { label: "HS Code", value: companyConfiguration.defaultHsCode },
                { label: "Packaging & Marking", value: finalFields.bagMarking },
                { label: "Description", value: finalFields.description },
                { label: "Net Weight (KG)", value: parity.quantityKg.toFixed(3) },
                { label: "Gross Weight (KG)", value: parity.grossWeightKg.toFixed(3) },
                { label: "No of Bags", value: finalFields.noOfBags },
                { label: "Full Marking", value: finalFields.bagMarking },
              ],
            },
          ],
          totals: sharedTotals,
        };
      }

      return {
        docType,
        docVariant: documentVariant,
        title: "Packing List - Final",
        sections: [
          {
            heading: "Shipment Overview",
            rows: [
              { label: "Shipper", value: sellerIdentity(snapshot) },
              { label: "Applicant", value: finalFields.applicant },
              { label: "Consignee", value: finalFields.consignee },
              { label: "Contract Ref", value: snapshot.contract.contractNumber },
              { label: "Bill of Lading", value: bookings?.billOfLadingNumber ?? "-" },
              { label: "Vessel", value: bookings?.vesselName ?? snapshot.shipment.vessel ?? "-" },
              { label: "Voyage", value: bookings?.voyageNo ?? snapshot.shipment.voyageNo ?? "-" },
              { label: "Booking Number", value: bookings?.bookingNumber ?? snapshot.contract.shipping.bookingNumber ?? "-" },
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
              { label: "Station", value: processing.stationName },
              { label: "Address", value: processing.stationAddress },
              {
                label: "Moisture",
                value: `${processing.moisturePercent.toFixed(2)}%`,
              },
            ],
          },
          ...(staffingRows.length > 0 ? [{
            heading: "Container and Seal Lines",
            rows: staffingRows.flatMap((row) => [
              { label: `Container ${row.rowNo}`, value: row.containerNumber ?? "-" },
              { label: `Seal ${row.rowNo}`, value: row.sealNumber ?? "-" },
              { label: `Cert ${row.rowNo}`, value: row.certNumber ?? "-" },
              { label: `Net Weight ${row.rowNo}`, value: row.netWeightKg?.toFixed(3) ?? "-" },
            ]),
          }] : []),
        ],
        totals: sharedTotals,
      };

    case "shipping_instructions":
      return {
        docType,
        docVariant: documentVariant,
        title: "Shipping Instructions",
        sections: [
          {
            heading: "Parties",
            rows: [
              { label: "Shipper", value: sellerIdentity(snapshot) },
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
              { label: "Booking Number", value: bookings?.bookingNumber ?? snapshot.contract.shipping.bookingNumber ?? "-" },
              { label: "Vessel / Voyage", value: [bookings?.vesselName, bookings?.voyageNo].filter(Boolean).join(" ") || "-" },
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
          ...(staffingRows.length > 0 ? [{
            heading: "Container Instructions",
            rows: staffingRows.flatMap((row) => [
              { label: `Container ${row.rowNo}`, value: row.containerNumber ?? "-" },
              { label: `Seal ${row.rowNo}`, value: row.sealNumber ?? "-" },
              { label: `Cert ${row.rowNo}`, value: row.certNumber ?? "-" },
            ]),
          }] : []),
        ],
        totals: sharedTotals,
      };

    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}
