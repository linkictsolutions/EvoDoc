import { buildCommercialInvoiceIccSample } from "@/domain/commercial-invoice-icc";
import { buildCertificateOfQualitySample } from "@/domain/certificate-quality";
import { buildCertificateOfWeightSample } from "@/domain/certificate-weight";
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

function sectionRowsFromRecord(values: Record<string, string>) {
  return Object.entries(values).map(([label, value]) => ({ label, value }));
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
  const documentVariant = snapshot.docVariant
    ?? (
      docType === "shipping_instructions"
      || docType === "quality_certificate"
      || docType === "weight_certificate"
        ? "standard"
        : "final"
    );
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
      {
        const sample = buildCommercialInvoiceIccSample(
          snapshot.contract,
          snapshot.customer,
          snapshot.shipment,
          companyConfiguration,
          snapshot.executionData?.bookings,
        );

        return {
          docType,
          docVariant: "standard",
          title: "Commercial Invoice (ICC)",
          sections: [
            {
              heading: "ICC Header",
              rows: sectionRowsFromRecord({
                Date: sample.header.date,
                "Ref No": sample.header.refNo,
                "Sales Contract Ref": sample.header.salesContractRef,
                "Sales Contract Date": sample.header.salesContractDate,
                "Exporter/Beneficiary/Seller": sample.header.exporterBeneficiarySeller,
                "Bank Permit Number": sample.header.bankPermitNumber,
                "Applicant/Notify": sample.header.applicantNotify,
                Consignee: sample.header.consignee,
                "Bill of Lading Number": sample.header.billOfLadingNumber,
                "Method of Dispatch": sample.header.methodOfDispatch,
                "ECCSA Certificate of Origin Number": sample.header.eccsaCertificateOfOriginNumber,
                "Vessel & Voyage Number": sample.header.vesselAndVoyageNumber,
                "Shipped on Board Date": sample.header.shippedOnBoardDate,
              }),
            },
            {
              heading: "ICC Goods",
              rows: sectionRowsFromRecord({
                "Description of Goods": sample.goodsLine.descriptionOfGoods,
                "HS Code": sample.goodsLine.hsCode,
                "Quantity in LB (Net)": sample.goodsLine.quantityLbNet,
                "Quantity in KG (Net)": sample.goodsLine.quantityKgNet,
                "Quantity in KG (Gross)": sample.goodsLine.quantityKgGross,
                "Packages in Bags": sample.goodsLine.packagesInBags,
                "Unit Price USC/LB": sample.goodsLine.unitPriceUscPerLb,
                "Total Price USD": sample.goodsLine.totalPriceUsd,
                "Total Amount USD": sample.goodsLine.totalAmountUsd,
                "Amount in Words": sample.goodsLine.amountInWords,
              }),
            },
            {
              heading: "ICC Bank Details",
              rows: sectionRowsFromRecord({
                "Bank of Beneficiary": sample.bank.bankOfBeneficiary,
                "Beneficiary Bank Address": sample.bank.beneficiaryBankAddress,
                "SWIFT Number": sample.bank.swiftNumber,
                "Beneficiary Name": sample.bank.beneficiaryName,
                "Beneficiary Account Number": sample.bank.beneficiaryAccountNumber,
                "Correspondent Bank Name": sample.bank.correspondentBankName,
                "Correspondent Bank Address": sample.bank.correspondentBankAddress,
                "Correspondent SWIFT Number": sample.bank.correspondentSwiftNumber,
                "Correspondent Account Number": sample.bank.correspondentAccountNumber,
              }),
            },
            {
              heading: "ICC Footer",
              rows: sectionRowsFromRecord({
                "Country of Origin": sample.footer.countryOfOrigin,
                "Place of Issue": sample.footer.placeOfIssue,
                "Port of Loading": sample.footer.portOfLoading,
                "Port of Discharge": sample.footer.portOfDischarge,
                "Final Destination": sample.footer.finalDestination,
                "Date of Issue": sample.footer.dateOfIssue,
                "Delivery/Trade Term": sample.footer.deliveryTradeTerm,
                "Type of Shipment": sample.footer.typeOfShipment,
                Incoterm: sample.footer.incoterm,
                "Term/Method of Payment": sample.footer.termMethodOfPayment,
                "Packaging & Marking (Label)": sample.footer.packagingAndMarkingLabel,
                "Full Marking": sample.footer.fullMarking,
              }),
            },
          ],
          totals: {
            ...sharedTotals,
            totalAmount: sample.goodsLine.totalAmountUsd,
          },
        };
      }

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

    case "quality_certificate":
      {
        const sample = buildCertificateOfQualitySample({
          contract: snapshot.contract,
          companyConfigurationInput: companyConfiguration,
          finalFields,
          processing: snapshot.executionData?.processing,
          bookings: snapshot.executionData?.bookings,
          staffingRows,
        });

        const containerRows = sample.containerLines.flatMap((line, index) => ([
          { label: `Container No ${index + 1}`, value: line.containerNo },
          { label: `Seal No ${index + 1}`, value: line.sealNo },
          { label: `Bags per Container ${index + 1}`, value: line.bagsPerContainer },
        ]));

        return {
          docType,
          docVariant: "standard",
          title: "Certificate of Quality",
          sections: [
            {
              heading: "Certificate Header",
              rows: sectionRowsFromRecord({
                Date: sample.header.date,
                "Ref No": sample.header.refNo,
                Statement: sample.header.titleStatement,
              }),
            },
            {
              heading: "Certificate Details",
              rows: sectionRowsFromRecord({
                "Mode of Transportation": sample.details.modeOfTransportation,
                "Moisture Content": sample.details.moistureContent,
                Shipper: sample.details.shipper,
                Notify: sample.details.notify,
                "Second Notify": sample.details.secondNotify,
                "Description of Goods": sample.details.descriptionOfGoods,
                Origin: sample.details.origin,
                Quality: sample.details.quality,
                "ICO No": sample.details.icoNo,
                "Cert No": sample.details.certNo,
                "Net Weight": sample.details.netWeight,
                "Gross Weight": sample.details.grossWeight,
                "Quantity in LB": sample.details.quantityLb,
                From: sample.details.from,
                To: sample.details.to,
              }),
            },
            {
              heading: "Container Table",
              rows: containerRows,
            },
            {
              heading: "Sign-off",
              rows: sectionRowsFromRecord({
                "Signatory Company": sample.details.signatoryCompany,
              }),
            },
          ],
          totals: {
            ...sharedTotals,
            preparedContainers: String(sample.containerLines.length),
          },
        };
      }

    case "weight_certificate":
      {
        const sample = buildCertificateOfWeightSample({
          contract: snapshot.contract,
          companyConfigurationInput: companyConfiguration,
          finalFields,
          staffingRows,
        });

        const containerRows = sample.containerLines.flatMap((line, index) => ([
          { label: `Container No ${index + 1}`, value: line.containerNo },
          { label: `Seal No ${index + 1}`, value: line.sealNo },
          { label: `Bags per Container ${index + 1}`, value: line.bagsPerContainer },
          { label: `Bag Weight Net ${index + 1}`, value: line.bagWeightNet },
          { label: `Bag Weight Gross ${index + 1}`, value: line.bagWeightGross },
          { label: `Container Net Weight ${index + 1}`, value: line.containerNetWeight },
          { label: `Container Gross Weight ${index + 1}`, value: line.containerGrossWeight },
        ]));

        return {
          docType,
          docVariant: "standard",
          title: "Certificate of Weight",
          sections: [
            {
              heading: "Certificate Header",
              rows: sectionRowsFromRecord({
                Date: sample.header.date,
                "Ref No": sample.header.refNo,
              }),
            },
            {
              heading: "Certificate Details",
              rows: sectionRowsFromRecord({
                Shipper: sample.details.shipper,
                Notify: sample.details.notify,
                "Second Notify": sample.details.secondNotify,
                "Description of Goods": sample.details.descriptionOfGoods,
                "Net Weight": sample.details.netWeight,
                "Gross Weight": sample.details.grossWeight,
                "Packages in Bags": sample.details.packagesInBags,
                Origin: sample.details.origin,
                Quality: sample.details.quality,
                "ICO No": sample.details.icoNo,
                "Cert No": sample.details.certNo,
                From: sample.details.from,
                To: sample.details.to,
              }),
            },
            {
              heading: "Container Weight Table",
              rows: containerRows,
            },
            {
              heading: "Totals",
              rows: sectionRowsFromRecord({
                "Total Net Weight": sample.totals.totalNetWeightKgs,
                "Total Gross Weight": sample.totals.totalGrossWeightKgs,
              }),
            },
          ],
          totals: {
            ...sharedTotals,
            preparedContainers: String(sample.containerLines.length),
          },
        };
      }

    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}
