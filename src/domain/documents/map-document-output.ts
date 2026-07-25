import { formatDateOfShipment } from "@/domain/date-format";
import { buildCommercialInvoiceIccSample } from "@/domain/commercial-invoice-icc";
import { buildBillOfLadingSample } from "@/domain/bill-of-lading";
import { buildCertificateOfQualitySample } from "@/domain/certificate-quality";
import { buildCertificateOfWeightSample } from "@/domain/certificate-weight";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import { computeContractExcelParity, resolveContractSiLcFinalFields } from "@/domain/excel-parity";
import { buildPackingListIccSample } from "@/domain/packing-list-icc";
import { formatGroupedFixed, formatGroupedNumber, formatMoney, formatWeight, WEIGHT_DP } from "@/domain/rounding";
import { buildWayBillSample } from "@/domain/way-bill";
import { ICC_DECLARATION_TEXT } from "@/domain/template-static-content";
import { combineVehicleField, vehicleGroupsWithContainers } from "@/domain/vehicle-container-groups";
import { formatPartyWithAddress } from "@/domain/party-and-packaging-text";
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

  return formatPartyWithAddress(companyConfiguration.sellerName, companyConfiguration.sellerAddress);
}

function sectionRowsFromRecord(values: Record<string, string>) {
  return Object.entries(values).map(([label, value]) => ({ label, value }));
}

function clean(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return "-";
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "-";
}

function formatDateDdMmYyyy(value: string | undefined): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return clean(value);
  }
  const dd = String(parsed.getUTCDate()).padStart(2, "0");
  const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(parsed.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function isRobusta(quality: string): boolean {
  return /robusta/i.test(quality);
}

function isWetProcessed(quality: string): boolean {
  return /washed|wet/i.test(quality);
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
      || docType === "ico_certificate"
      || docType === "bill_of_lading"
        ? "standard"
        : "final"
    );
  const bookings = snapshot.executionData?.bookings;
  const staffingRows = snapshot.executionData?.staffing?.finalRows ?? [];

  const sharedTotals = {
    totalBags: finalFields.noOfBags,
    totalNetWeight: formatWeight(parity.quantityKg),
    totalGrossWeight: formatWeight(parity.grossWeightKg),
    totalNetWeightMt: `${formatGroupedFixed(parity.quantityMt, WEIGHT_DP)} MT`,
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
                "Date of Shipment": sample.header.dateOfShipment,
                "Cert Number(s)": sample.header.certNumbers,
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
                Declaration: ICC_DECLARATION_TEXT,
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
      {
        const clean = (value: string | undefined | null): string => {
          if (value === undefined || value === null) {
            return "-";
          }

          const normalized = value.trim();
          return normalized.length > 0 ? normalized : "-";
        };

        const siCargoDescription = [
          "ETHIOPIAN COFFEE, UNWASHED ARABICA,",
          clean(finalFields.origin),
          `GRADE ${clean(finalFields.grade)}`,
          `CROP YEAR ${clean(finalFields.cropYear)}`,
          `AS PER CONTRACT REF.${clean(snapshot.contract.contractNumber)}`,
        ].join(" ");

        const containerRows = vehicleGroupsWithContainers(staffingRows)
          .map((group, index) => ([
            { label: `Container No ${index + 1}`, value: clean(combineVehicleField(group.truck?.containerNumber, group.trailer?.containerNumber)) },
            { label: `Seal No ${index + 1}`, value: clean(combineVehicleField(group.truck?.sealNumber, group.trailer?.sealNumber)) },
            { label: `Cert No ${index + 1}`, value: clean(combineVehicleField(group.truck?.certNumber, group.trailer?.certNumber)) },
          ]))
          .flat();

        return {
          docType,
          docVariant: documentVariant,
          title: "Shipping Instruction",
          sections: [
            {
              heading: "SI Sheet Values",
              rows: [
                { label: "Date", value: formatDateDdMmYyyy(new Date().toISOString()) },
                { label: "Ref No", value: clean(snapshot.contract.documentRefs?.shipping_instruction ?? snapshot.contract.contractNumber) },
                { label: "Shipper (E10)", value: clean(sellerIdentity(snapshot)) },
                { label: "Consignee (E11)", value: clean(finalFields.consignee) },
                { label: "Notify (E12)", value: clean(finalFields.notify) },
                { label: "2nd Notify (E13)", value: finalFields.secondNotify === "-" ? "" : clean(finalFields.secondNotify) },
                { label: "Shipping Line / Service Contract (E17)", value: clean(snapshot.contract.shipping.serviceContract) },
                { label: "Cargo Description (E18)", value: siCargoDescription },
                { label: "HS Code (E19)", value: clean(companyConfiguration.defaultHsCode) },
                { label: "Quantity (E20)", value: `${snapshot.contract.terms.quantityBags} BAGS (${parity.containerCount}*20)` },
                { label: "Gross Weight (H21)", value: `${formatGroupedNumber(parity.grossWeightKg)} KGS` },
                { label: "Net Weight (O21)", value: `${formatGroupedNumber(parity.quantityKg)} KGS` },
                { label: "Cert Number (E23)", value: clean(finalFields.certNo) },
                { label: "Number Type and Size of Containers (E27)", value: `${Math.max(0, parity.containerCount)} FCL` },
                { label: "Port of Loading (E29)", value: clean(finalFields.portOfLoading) },
                { label: "Place of Discharge (E30)", value: clean(finalFields.destination) },
                { label: "Booking Number (E31)", value: clean(bookings?.bookingNumber ?? snapshot.contract.shipping.bookingNumber) },
                { label: "Date of Shipment", value: clean(formatDateOfShipment(snapshot.contract.shipping.shipmentMonth ?? snapshot.contract.terms.shipmentPeriod ?? snapshot.contract.banking.latestShipmentDate)) },
                { label: "Additional Document / Remark (E33)", value: "14 DAYS FREE TIME AT PORT OF DISCHARGE" },
                { label: "Cargo Moved By (E34)", value: "BY TRUCK" },
              ],
            },
            ...(containerRows.length > 0
              ? [{
                heading: "SI Container Table (E36/K36/N36 onward)",
                rows: containerRows,
              }]
              : []),
          ],
          totals: sharedTotals,
        };
      }

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
          bookings,
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
              Exporter: driverTab.exporter,
              To: driverTab.to,
              "To Contact": driverTab.toContact,
              "Truck No": driverTab.truckNo,
              "Trailer No": driverTab.trailerNo,
              "Driver Name": driverTab.driverName,
              "Seller Name": clean(companyConfiguration.sellerName),
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
              "Transport Charge Per Quantal": driverTab.transportChargePerQuantal,
              "Transport Charge Total": driverTab.transportChargeTotal,
              "Demurrage Price": driverTab.demurragePrice,
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

    case "ico_certificate":
      {
        const overrides = snapshot.contract.icoOverrides ?? {};
        const fromOverride = (value: string | undefined, fallback: string): string => {
          const normalized = value?.trim();
          return normalized ? normalized : fallback;
        };
        const icoPrefix = clean(companyConfiguration.icoReferencePrefix);
        const prefixParts = icoPrefix === "-" ? [] : icoPrefix.split("/").map((part) => part.trim()).filter(Boolean);
        const countryCode = fromOverride(overrides.countryCode, prefixParts[0] ?? "010");
        const portCode = fromOverride(overrides.portCode, prefixParts[1] ?? "01");
        const serialNo = fromOverride(overrides.serialNo, clean(finalFields.certNo));
        const quantityText = `${snapshot.contract.terms.quantityBags} BAGS`;
        const vesselLine = [
          clean(bookings?.shippingLine),
          clean(bookings?.vesselName),
          clean(bookings?.voyageNo),
        ].filter((entry) => entry !== "-").join(" ");
        const exportDate = fromOverride(
          overrides.dateOfExport,
          formatDateDdMmYyyy(snapshot.contract.terms.shipmentPeriod || new Date().toISOString()),
        );
        const issueDate = fromOverride(overrides.issuingDate, formatDateDdMmYyyy(new Date().toISOString()));
        const certifyingDate = fromOverride(overrides.certifyingDate, issueDate);
        const placeOfIssue = fromOverride(overrides.place, clean(companyConfiguration.placeOfIssue));
        const quality = clean(finalFields.quality);
        const hasRobusta = isRobusta(quality);
        const wetProcessed = isWetProcessed(quality);

        return {
          docType,
          docVariant: "standard",
          title: "ICO Certificate of Origin",
          sections: [
            {
              heading: "ICO Certificate",
              rows: sectionRowsFromRecord({
                "1 Exporter/Consignor":
                  fromOverride(
                    overrides.exporterConsignor,
                    `${sellerIdentity(snapshot)} Email: ${clean(companyConfiguration.companyEmail)} TEL: ${clean(companyConfiguration.companyPhone)}`,
                  ),
                "2 Notify Address": fromOverride(overrides.notifyAddress, clean(finalFields.notify)),
                "3 Internal Reference No": fromOverride(overrides.internalReferenceNo, clean(snapshot.contract.contractNumber)),
                "4 Country Code": countryCode,
                "4 Port Code": portCode,
                "4 Serial No": serialNo,
                "5 Producing Country": fromOverride(overrides.producingCountry, clean(finalFields.origin)),
                "6 Country of Destination": fromOverride(overrides.countryDestination, clean(finalFields.destination)),
                "7 Date of Export (DD/MM/YY)": exportDate,
                "8 Country of Trans-shipment": fromOverride(overrides.countryTransShipment, clean(companyConfiguration.transitorLocation)),
                "9 Name of Carrier": fromOverride(overrides.nameOfCarrier, vesselLine || "-"),
                "10 ICO Identification Mark": fromOverride(overrides.icoIdentificationMark, `${icoPrefix}/${serialNo}`),
                "10 Other Marks ICO No": fromOverride(overrides.otherMarksIcoNo, `ICO NO: ${icoPrefix}/${serialNo}`),
                "10 Other Marks Cert No": fromOverride(overrides.otherMarksCertNo, `CERT NO: ${clean(finalFields.certNo)}`),
                "11 Shipped in - Bags": "No",
                "11 Shipped in - Containers": snapshot.contract.terms.packagingUnit.toLowerCase() === "bulk" ? "No" : "Yes",
                "11 Shipped in - Bulk": snapshot.contract.terms.packagingUnit.toLowerCase() === "bulk" ? "Yes" : "No",
                "11 Shipped in - Other": "No",
                "12 Net Weight of Shipment": String(parity.quantityKg),
                "13 Unit of Weight": "kg",
                "14 Description - Green Arabica": hasRobusta ? "No" : "Yes",
                "14 Description - Green Robusta": hasRobusta ? "Yes" : "No",
                "14 Description - Roasted": "No",
                "14 Description - Soluble": "No",
                "14 Description - Other (specify)": fromOverride(overrides.descriptionOtherSpecify, clean(finalFields.description)),
                "15 Processing Method - Dry": wetProcessed ? "No" : "Yes",
                "15 Processing Method - Wet": wetProcessed ? "Yes" : "No",
                "15 Processing Method - Decaffeinated": "No",
                "15 Processing Method - Organic": "No",
                "16 Issuing Officer Date": `${issueDate} ${placeOfIssue}`,
                "16 Certifying Officer Date": `${certifyingDate} ${placeOfIssue}`,
                "16 Place": placeOfIssue,
                "16 Certification Statement":
                  "IT IS HEREBY CERTIFIED THAT THE COFFEE DESCRIBED ABOVE WAS GROWN IN THE COUNTRY NAMED IN BOX 5 AND HAS BEEN EXPORTED ON THE DATE SHOWN BELOW",
                "17 Reserved": fromOverride(overrides.partBText, ""),
                "Quantity Expression": quantityText,
              }),
            },
          ],
          totals: {
            ...sharedTotals,
            countryCode,
            portCode,
            serialNo,
          },
        };
      }

    case "bill_of_lading":
      {
        const sample = buildBillOfLadingSample({
          contract: snapshot.contract,
          customer: snapshot.customer,
          companyConfigurationInput: companyConfiguration,
          bookings: snapshot.executionData?.bookings,
          staffingRows,
        });

        return {
          docType,
          docVariant: "standard",
          title: "Bill of Lading (MSC)",
          sections: [
            {
              heading: "BL Meta",
              rows: sectionRowsFromRecord({
                "Bill Type": sample.meta.billType,
                "Page Label": sample.meta.pageLabel,
                "No. Copy Bills": sample.meta.noOfCopyBills,
                "No. Rider Pages": sample.meta.noOfRiderPages,
                "Bill No": sample.meta.billNo,
                "Reference Type": sample.meta.referenceType,
                "Reference Value": sample.meta.referenceValue,
              }),
            },
            {
              heading: "BL Parties",
              rows: sectionRowsFromRecord({
                Shipper: sample.parties.shipper,
                Consignee: sample.parties.consignee,
                "Notify Parties": sample.parties.notifyParty,
                "Carrier Agents Endorsements": sample.parties.carrierAgentsEndorsements,
                "Notify 2": sample.parties.notify2,
                "Notify 3": sample.parties.notify3,
              }),
            },
            {
              heading: "BL Routing",
              rows: sectionRowsFromRecord({
                "Vessel & Voyage No": sample.routing.vesselAndVoyageNo,
                "Port of Loading": sample.routing.portOfLoading,
                "Place of Receipt": sample.routing.placeOfReceipt,
                "Port of Discharge": sample.routing.portOfDischarge,
                "Place of Delivery": sample.routing.placeOfDelivery,
              }),
            },
            {
              heading: "BL Cargo Table",
              rows: sectionRowsFromRecord({
                "Container Numbers, Seal Numbers and Marks": sample.cargo.marks,
                "Description of Packages and Goods": sample.cargo.description,
                "Gross Cargo Weight": sample.cargo.grossCargoWeight,
                Measurement: sample.cargo.measurement,
              }),
            },
            {
              heading: "BL Footer",
              rows: sectionRowsFromRecord({
                "Freight & Charges": sample.footer.freightAndCharges,
                "Legal Text": sample.footer.legalText,
                "Declared Value": sample.footer.declaredValue,
                "Carrier Receipt": sample.footer.carrierReceipt,
                "Signed on Behalf": sample.footer.signedOnBehalf,
                "Place and Date of Issue": sample.footer.placeAndDateOfIssue,
                "Shipped on Board Date": sample.footer.shippedOnBoardDate,
              }),
            },
            ...sample.riderPages.map((page) => ({
              heading: `BL Rider ${page.index}`,
              rows: sectionRowsFromRecord({
                "Bill of Lading No": page.billNo,
                "Rider Page Label": `RIDER PAGE ${page.index + 1} OF ${page.totalPages}`,
                "Container Numbers, Seal Numbers and Marks": page.marks,
                "Rider Description": page.description,
                "Gross Cargo Weight": page.grossCargoWeight,
                Measurement: page.measurement,
                "Place and Date of Issue": page.placeAndDateOfIssue,
                "Shipped on Board Date": page.shippedOnBoardDate,
              }),
            })),
          ],
          totals: {
            ...sharedTotals,
            riderPages: String(sample.riderPages.length),
          },
        };
      }

    default:
      throw new Error(`Unsupported document type: ${docType}`);
  }
}
