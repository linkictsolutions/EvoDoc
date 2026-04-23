import { buildCommercialInvoiceIccSample } from "@/domain/commercial-invoice-icc";
import { buildCertificateOfQualitySample } from "@/domain/certificate-quality";
import { buildCertificateOfWeightSample } from "@/domain/certificate-weight";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { computeContractExcelParity, resolveContractSiLcFinalFields } from "@/domain/excel-parity";
import { buildPackingListIccSample } from "@/domain/packing-list-icc";
import { formatMoney, formatWeight } from "@/domain/rounding";
import { buildWayBillSample } from "@/domain/way-bill";
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
      || docType === "way_bill"
        ? "standard"
        : "final"
    );
  const bookings = snapshot.executionData?.bookings;
  const staffingRows = snapshot.executionData?.staffing?.finalRows ?? [];

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
      {
        const sample = buildPackingListIccSample({
          contract: snapshot.contract,
          customer: snapshot.customer,
          companyConfigurationInput: companyConfiguration,
          finalFields,
          bookings: snapshot.executionData?.bookings,
          staffingRows,
          processing: snapshot.executionData?.processing,
        });

        const containerRows = sample.containerLines.flatMap((line, index) => ([
          { label: `Container No ${index + 1}`, value: line.containerNumber },
          { label: `Seal No ${index + 1}`, value: line.sealNumber },
          { label: `No. of Packages ${index + 1}`, value: line.packages },
          { label: `Net Weight in KGS ${index + 1}`, value: line.netWeightKgs },
          { label: `Gross Weight in KGS ${index + 1}`, value: line.grossWeightKgs },
        ]));

        return {
          docType,
          docVariant: "standard",
          title: "Packing List (ICC)",
          sections: [
            {
              heading: "ICC Header",
              rows: sectionRowsFromRecord({
                Date: sample.header.date,
                "Sales Contract Ref": sample.header.salesContractRef,
                "Ref No": sample.header.refNo,
                "Sales Contract Date": sample.header.salesContractDate,
                "Exporter/Beneficiary/Seller": sample.header.exporterBeneficiarySeller,
                "Bank Permit Number": sample.header.bankPermitNumber,
                "Applicant/Notify": sample.header.applicantNotify,
                "Bill of Lading Number": sample.header.billOfLadingNumber,
                "Shipping Line": sample.header.shippingLine,
                "Vessel Name": sample.header.vesselName,
                "Voyage No": sample.header.voyageNo,
                Consignee: sample.header.consignee,
                "Shipped on Board Date": sample.header.shippedOnBoardDate,
                "ECCSA Certificate of Origin Number": sample.header.eccsaCertificateOfOriginNumber,
              }),
            },
            {
              heading: "ICC Goods",
              rows: sectionRowsFromRecord({
                "Description of Goods": sample.goods.descriptionOfGoods,
                "HS Code": sample.goods.hsCode,
                "Grand Total Packages": sample.totals.grandTotalPackages,
                "Grand Total Net Weight KGS": sample.totals.grandTotalNetWeightKgs,
                "Grand Total Gross Weight KGS": sample.totals.grandTotalGrossWeightKgs,
              }),
            },
            {
              heading: "ICC Container Lines",
              rows: containerRows,
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
                "Packaging & Marking (Label)": sample.footer.packagingMarkingLabel,
                "Total Net Weight (MT)": sample.footer.totalNetWeightMt,
                "Total Gross Weight (MT)": sample.footer.totalGrossWeightMt,
                "Packing Date": sample.footer.packingDate,
                "Packing Place": sample.footer.packingPlace,
                Address: sample.footer.address,
                "Full Marking": sample.footer.fullMarking,
                "Signatory Company": sample.footer.signatoryCompany,
                "Authorized Signatory Name": sample.footer.authorizedSignatoryName,
                Declaration: sample.footer.declaration,
              }),
            },
          ],
          totals: {
            ...sharedTotals,
            totalBags: sample.totals.grandTotalPackages,
            totalNetWeight: sample.totals.grandTotalNetWeightKgs,
            totalGrossWeight: sample.totals.grandTotalGrossWeightKgs,
            totalNetWeightMt: sample.footer.totalNetWeightMt,
          },
        };
      }

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

    case "way_bill":
      {
        const sample = buildWayBillSample({
          contract: snapshot.contract,
          companyConfigurationInput: companyConfiguration,
          finalFields,
          staffingRows,
        });

        return {
          docType,
          docVariant: "standard",
          title: "Way Bill",
          sections: sample.drivers.map((driverTab, index) => ({
            heading: `Driver ${index + 1} - ${driverTab.tabLabel}`,
            rows: sectionRowsFromRecord({
              Date: driverTab.date,
              "Ref No": driverTab.refNo,
              To: driverTab.to,
              "To Contact": driverTab.toContact,
              "Truck No": driverTab.truckNo,
              "Trailer No": driverTab.trailerNo,
              "Driver Name": driverTab.driverName,
              "Driver Phone No": driverTab.driverPhoneNo,
              "License No": driverTab.licenseNo,
              "Final Destination": driverTab.finalDestination,
              "Driver Declaration": driverTab.driverDeclaration,
              "Terms Intro": driverTab.conditionIntro,
              "Condition 1": driverTab.condition1,
              "Condition 2": driverTab.condition2,
              "Condition 3": driverTab.condition3,
              "Detail of Goods": driverTab.detailOfGoods,
              "ICO No": driverTab.icoNo,
              "Cert No": driverTab.certNo,
              "No of Bag": driverTab.noOfBag,
              "Gross Weight": driverTab.grossWeight,
              "Net Weight": driverTab.netWeight,
              "Transport Charge Label": driverTab.transportChargeLabel,
              "Transport Charge Per Quantal Label": driverTab.transportChargePerQuantalLabel,
              "Transport Charge Total Label": driverTab.transportChargeTotalLabel,
              "Container No 1": driverTab.containerNo1,
              "Seal No 1": driverTab.sealNo1,
              "Container No 2": driverTab.containerNo2,
              "Seal No 2": driverTab.sealNo2,
              "Amharic Declaration": driverTab.amharicDeclaration,
              "Driver Name Label": driverTab.signatoryDriverLabel,
              "Driver Signature Label": driverTab.signatoryLeftLabel,
              "Dispatch Signature Label": driverTab.signatoryRightLabel,
              "Driver Date Label": driverTab.signatoryDateLabel,
              "Stamp Date Label": driverTab.signatoryStampDateLabel,
            }),
          })),
          totals: {
            ...sharedTotals,
            drivers: String(sample.drivers.length),
          },
        };
      }

    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}
