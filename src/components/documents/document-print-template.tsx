"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { resolveCompanyConfiguration } from "@/domain/company-configuration";
import type { DocumentInputSnapshot, DocumentOutputSnapshot, DocumentType } from "@/types/models";

type Props = {
  output: DocumentOutputSnapshot;
  documentId: string;
  input?: DocumentInputSnapshot;
  isFinal?: boolean;
};

type Row = { label: string; value: string };

function flattenRows(output: DocumentOutputSnapshot): Row[] {
  return output.sections.flatMap((section) => section.rows);
}

function value(rows: Row[], label: string): string {
  return rows.find((row) => row.label === label)?.value ?? "-";
}

function display(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const normalized = value.trim();
  if (!normalized || normalized === "-") {
    return "";
  }

  return value;
}

function IccInvoicePrintView({ output, documentId, isFinal }: Props) {
  const rows = flattenRows(output);

  return (
    <article className="print-sheet icc-sheet">
      <table className="print-table icc-table">
        <tbody>
          <tr>
            <td colSpan={5}><strong>COMMERCIAL INVOICE</strong></td>
            <td colSpan={5} className="table-align-right">
              <strong>PAGE 1 OF 1 | {isFinal ? "FINAL" : "ORIGINAL"}</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Date:</strong> {display(value(rows, "Date"))}</td>
            <td colSpan={3}><strong>Sales Contract Ref:</strong> {display(value(rows, "Sales Contract Ref"))}</td>
            <td colSpan={2}><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</td>
            <td colSpan={5}><strong>Sales Contract Date:</strong> {display(value(rows, "Sales Contract Date"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Exporter/Beneficiary/Seller</strong><br />{display(value(rows, "Exporter/Beneficiary/Seller"))}</td>
            <td colSpan={5}><strong>Bank Permit Number:</strong> {display(value(rows, "Bank Permit Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Applicant/Notify</strong><br />{display(value(rows, "Applicant/Notify"))}</td>
            <td colSpan={5}><strong>Bill of Lading Number:</strong> {display(value(rows, "Bill of Lading Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Consignee</strong><br />{display(value(rows, "Consignee"))}</td>
            <td colSpan={5}><strong>Method of Dispatch:</strong> {display(value(rows, "Method of Dispatch"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>ECCSA - Certificate of Origin Number:</strong> {display(value(rows, "ECCSA Certificate of Origin Number"))}</td>
            <td colSpan={5}><strong>Vessel &amp; Voyage Number:</strong> {display(value(rows, "Vessel & Voyage Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}></td>
            <td colSpan={5}><strong>Shipped on Board Date:</strong> {display(value(rows, "Shipped on Board Date"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table icc-table icc-footer-table mt-sm">
        <thead>
          <tr>
            <th>S / N</th>
            <th>DESCRIPTION OF GOODS</th>
            <th>HS CODE</th>
            <th>QUANTITY IN LB (NET)</th>
            <th>QUANTITY IN KG (NET)</th>
            <th>QUANTITY IN KG (GROSS)</th>
            <th>PACKAGES IN BAGS</th>
            <th>UNIT PRICE USC/LB</th>
            <th>TOTAL PRICE USD</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>{display(value(rows, "Description of Goods"))}</td>
            <td>{display(value(rows, "HS Code"))}</td>
            <td>{display(value(rows, "Quantity in LB (Net)"))}</td>
            <td>{display(value(rows, "Quantity in KG (Net)"))}</td>
            <td>{display(value(rows, "Quantity in KG (Gross)"))}</td>
            <td>{display(value(rows, "Packages in Bags"))}</td>
            <td>{display(value(rows, "Unit Price USC/LB"))}</td>
            <td>{display(value(rows, "Total Price USD"))}</td>
          </tr>
          <tr>
            <td colSpan={8} className="table-align-right"><strong>TOTAL AMOUNT IN USD</strong></td>
            <td><strong>{display(value(rows, "Total Amount USD"))}</strong></td>
          </tr>
          <tr>
            <td colSpan={9}><strong>AMOUNT IN WORDS:</strong> {display(value(rows, "Amount in Words"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table icc-table mt-sm">
        <tbody>
          <tr>
            <td colSpan={5}><strong>Bank Details (Beneficiary)</strong></td>
            <td colSpan={4}><strong>Correspondent Bank</strong></td>
          </tr>
          <tr>
            <td colSpan={3}><strong>Bank of Beneficiary:</strong> {display(value(rows, "Bank of Beneficiary"))}</td>
            <td colSpan={2}><strong>Address of Bank:</strong> {display(value(rows, "Beneficiary Bank Address"))}</td>
            <td colSpan={2}><strong>Bank Name:</strong> {display(value(rows, "Correspondent Bank Name"))}</td>
            <td colSpan={2}><strong>Address:</strong> {display(value(rows, "Correspondent Bank Address"))}</td>
          </tr>
          <tr>
            <td colSpan={3}><strong>Name of Beneficiary:</strong> {display(value(rows, "Beneficiary Name"))}</td>
            <td colSpan={2}><strong>SWIFT Number:</strong> {display(value(rows, "SWIFT Number"))}</td>
            <td colSpan={2}><strong>SWIFT Number:</strong> {display(value(rows, "Correspondent SWIFT Number"))}</td>
            <td colSpan={2}><strong>Acc. No:</strong> {display(value(rows, "Correspondent Account Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Beneficiaries Acc. No:</strong> {display(value(rows, "Beneficiary Account Number"))}</td>
            <td colSpan={4}></td>
          </tr>
        </tbody>
      </table>

      <table className="print-table icc-table mt-sm">
        <tbody>
          <tr>
            <td><strong>Country of Origin:</strong> {display(value(rows, "Country of Origin"))}</td>
            <td><strong>Place of Issue:</strong> {display(value(rows, "Place of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Loading:</strong> {display(value(rows, "Port of Loading"))}</td>
            <td><strong>Date of Issue:</strong> {display(value(rows, "Date of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Discharge:</strong> {display(value(rows, "Port of Discharge"))}</td>
            <td><strong>Signatory Company:</strong> -</td>
          </tr>
          <tr>
            <td><strong>Final Destination:</strong> {display(value(rows, "Final Destination"))}</td>
            <td><strong>Name of Authorized Signatory:</strong> -</td>
          </tr>
          <tr>
            <td><strong>Delivery/Trade Term:</strong> {display(value(rows, "Delivery/Trade Term"))}</td>
            <td rowSpan={2}>
              We hereby certify that this invoice is in all respects correct and true, as regards to both
              the prices and description of the goods referred to herein, and that the country of origin
              of the goods is Ethiopia.
            </td>
          </tr>
          <tr>
            <td><strong>Type of Shipment:</strong> {display(value(rows, "Type of Shipment"))}</td>
          </tr>
          <tr>
            <td><strong>Incoterm:</strong> {display(value(rows, "Incoterm"))}</td>
            <td><strong>Authorized Signature &amp; Company Seal/Stamp</strong></td>
          </tr>
          <tr>
            <td><strong>Term/Method of Payment:</strong> {display(value(rows, "Term/Method of Payment"))}</td>
            <td></td>
          </tr>
          <tr>
            <td className="preserve-linebreaks"><strong>Packaging &amp; Marking (Label):</strong> {display(value(rows, "Packaging & Marking (Label)"))}</td>
            <td></td>
          </tr>
          <tr className="icc-full-marking-row">
            <td className="icc-full-marking-cell preserve-linebreaks"><strong>FULL MARKING</strong><br />{display(value(rows, "Full Marking"))}</td>
            <td className="icc-signature-cell"></td>
          </tr>
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function PackingListIccPrintView({ output, documentId, isFinal }: Props) {
  const rows = flattenRows(output);
  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const packages = indexedValues(rows, "No. of Packages ");
  const netWeights = indexedValues(rows, "Net Weight in KGS ");
  const grossWeights = indexedValues(rows, "Gross Weight in KGS ");
  const lineIndexes = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...packages.keys(),
    ...netWeights.keys(),
    ...grossWeights.keys(),
  ])).sort((a, b) => a - b);

  return (
    <article className="print-sheet packing-icc-sheet">
      <table className="print-table packing-icc-table">
        <tbody>
          <tr>
            <td colSpan={5}><strong>PACKING LIST</strong></td>
            <td colSpan={5} className="table-align-right"><strong>PAGE 1 OF 1 | {isFinal ? "FINAL" : "ORIGINAL"}</strong></td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Date:</strong> {display(value(rows, "Date"))}</td>
            <td colSpan={5}><strong>Sales Contract Ref:</strong> {display(value(rows, "Sales Contract Ref"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</td>
            <td colSpan={5}><strong>Sales Contract Date:</strong> {display(value(rows, "Sales Contract Date"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Exporter/Beneficiary/Seller</strong><br />{display(value(rows, "Exporter/Beneficiary/Seller"))}</td>
            <td colSpan={5}><strong>Bank Permit Number:</strong> {display(value(rows, "Bank Permit Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Applicant/Notify</strong><br />{display(value(rows, "Applicant/Notify"))}</td>
            <td colSpan={5}><strong>Bill of Lading Number:</strong> {display(value(rows, "Bill of Lading Number"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>Consignee</strong><br />{display(value(rows, "Consignee"))}</td>
            <td colSpan={5}><strong>Shipped on Board Date:</strong> {display(value(rows, "Shipped on Board Date"))}</td>
          </tr>
          <tr>
            <td colSpan={3}><strong>Shipping Line:</strong> {display(value(rows, "Shipping Line"))}</td>
            <td colSpan={2}><strong>Vessel:</strong> {display(value(rows, "Vessel Name"))}</td>
            <td colSpan={3}><strong>Voyage No:</strong> {display(value(rows, "Voyage No"))}</td>
            <td colSpan={2}><strong>ECCSA - Certificate of Origin Number:</strong> {display(value(rows, "ECCSA Certificate of Origin Number"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm">
        <tbody>
          <tr>
            <td colSpan={5}><strong>DESCRIPTION OF GOODS:</strong> {display(value(rows, "Description of Goods"))}</td>
          </tr>
          <tr>
            <td colSpan={5}><strong>HS CODE:</strong> {display(value(rows, "HS Code"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm">
        <thead>
          <tr>
            <th>CONTAINER NUMBER</th>
            <th>SEAL NUMBER</th>
            <th>NO. OF PACKAGES</th>
            <th>NET WEIGHT IN KGS</th>
            <th>GROSS WEIGHT IN KGS</th>
          </tr>
        </thead>
        <tbody>
          {lineIndexes.length > 0 ? (
            lineIndexes.map((index) => (
              <tr key={`packing-icc-line-${index}`}>
                <td>{display(containers.get(index))}</td>
                <td>{display(seals.get(index))}</td>
                <td>{display(packages.get(index))}</td>
                <td>{display(netWeights.get(index))}</td>
                <td>{display(grossWeights.get(index))}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>No prepared containers in staffing yet.</td>
            </tr>
          )}
          <tr>
            <td colSpan={2}><strong>Grand Total:</strong></td>
            <td><strong>{display(value(rows, "Grand Total Packages"))}</strong></td>
            <td><strong>{display(value(rows, "Grand Total Net Weight KGS"))}</strong></td>
            <td><strong>{display(value(rows, "Grand Total Gross Weight KGS"))}</strong></td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm">
        <tbody>
          <tr>
            <td><strong>Country of Origin:</strong> {display(value(rows, "Country of Origin"))}</td>
            <td><strong>Place of Issue:</strong> {display(value(rows, "Place of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Loading:</strong> {display(value(rows, "Port of Loading"))}</td>
            <td><strong>Date of Issue:</strong> {display(value(rows, "Date of Issue"))}</td>
          </tr>
          <tr>
            <td><strong>Port of Discharge:</strong> {display(value(rows, "Port of Discharge"))}</td>
            <td><strong>Signatory Company:</strong> {display(value(rows, "Signatory Company"))}</td>
          </tr>
          <tr>
            <td><strong>Final Destination:</strong> {display(value(rows, "Final Destination"))}</td>
            <td><strong>Authorized Signatory Name:</strong> {display(value(rows, "Authorized Signatory Name"))}</td>
          </tr>
          <tr>
            <td><strong>Delivery/Trade Term:</strong> {display(value(rows, "Delivery/Trade Term"))}</td>
            <td rowSpan={3} className="packing-icc-declaration-cell">{display(value(rows, "Declaration"))}</td>
          </tr>
          <tr>
            <td><strong>Type of Shipment:</strong> {display(value(rows, "Type of Shipment"))}</td>
          </tr>
          <tr>
            <td><strong>Incoterm:</strong> {display(value(rows, "Incoterm"))}</td>
          </tr>
          <tr>
            <td><strong>Term/Method of Payment:</strong> {display(value(rows, "Term/Method of Payment"))}</td>
            <td><strong>Total Net Weight (MT):</strong> {display(value(rows, "Total Net Weight (MT)"))}</td>
          </tr>
          <tr>
            <td className="preserve-linebreaks"><strong>Packaging &amp; Marking (Label):</strong> {display(value(rows, "Packaging & Marking (Label)"))}</td>
            <td><strong>Total Gross Weight (MT):</strong> {display(value(rows, "Total Gross Weight (MT)"))}</td>
          </tr>
          <tr>
            <td><strong>Packing Date:</strong> {display(value(rows, "Packing Date"))}</td>
            <td><strong>Packing Place:</strong> {display(value(rows, "Packing Place"))}</td>
          </tr>
          <tr>
            <td colSpan={2}><strong>Address:</strong> {display(value(rows, "Address"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table packing-icc-table mt-sm packing-icc-footer-table">
        <tbody>
          <tr className="packing-icc-full-marking-row">
            <td className="packing-icc-marking-cell preserve-linebreaks"><strong>FULL MARKING:</strong><br />{display(value(rows, "Full Marking"))}</td>
            <td className="packing-icc-signature-cell"><strong>Authorized Signature &amp; Company Seal/Stamp</strong></td>
          </tr>
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function PermitPackingListPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const shipper = value(rows, "Shipper");
  const notify = value(rows, "Notify");
  const contractRef = value(rows, "Contract Ref");
  const contractDate = value(rows, "Contract Date");
  const paymentTerm = value(rows, "Payment Term");
  const lcNumber = value(rows, "LC Number");
  const deliveryTerm = value(rows, "Delivery Term");
  const portOfLoading = value(rows, "Port of Loading");
  const portOfDischarge = value(rows, "Port of Discharge");
  const finalDestination = value(rows, "Final Destination");
  const hsCode = value(rows, "HS Code");
  const packagingMarking = value(rows, "Packaging & Marking");
  const description = value(rows, "Description");
  const netWeightKg = value(rows, "Net Weight (KG)");
  const grossWeightKg = value(rows, "Gross Weight (KG)");
  const noOfBags = value(rows, "No of Bags");
  const fullMarking = value(rows, "Full Marking");

  return (
    <article className="print-sheet permit-packing-sheet">
      <div className="permit-sheet-top-meta">
        <p>DATE:</p>
        <p>REF. NO.</p>
      </div>

      <header className="permit-invoice-title">
        <h1>PACKING LIST CERTIFICATE</h1>
      </header>

      <table className="print-table permit-invoice-table">
        <tbody>
          <tr>
            <th>SHIPPER</th>
            <td colSpan={6}>{shipper}</td>
          </tr>
          <tr>
            <th>NOTIFY</th>
            <td colSpan={6}>{notify}</td>
          </tr>
          <tr>
            <th>REFERENCE</th>
            <th>SALES CONTRACT REF. NO</th>
            <td>{contractRef}</td>
            <th>DATED</th>
            <td colSpan={3}>{contractDate}</td>
          </tr>
          <tr>
            <th>IF TERM OF PAYMENT</th>
            <td colSpan={6}>{paymentTerm}</td>
          </tr>
          <tr>
            <th>L.C NO</th>
            <td colSpan={6}>{lcNumber}</td>
          </tr>
          <tr>
            <th>DELIVERY TERM</th>
            <td>{deliveryTerm}</td>
            <th>PORT OF LOADING</th>
            <td colSpan={4}>{portOfLoading}</td>
          </tr>
          <tr>
            <th>PORT OF DISCHARGE</th>
            <td>{portOfDischarge}</td>
            <th>FINAL DESTINATION</th>
            <td colSpan={4}>{finalDestination}</td>
          </tr>
          <tr>
            <th>HS CODE</th>
            <td colSpan={6}>{hsCode}</td>
          </tr>
          <tr>
            <th>PACKAGING &amp; MARKING</th>
            <td colSpan={6} className="preserve-linebreaks">{packagingMarking}</td>
          </tr>
          <tr>
            <th rowSpan={3}>DESCRIPTION OF GOODS</th>
            <th colSpan={2}>QUANTITY IN KG</th>
            <th colSpan={4}>PACKAGES IN BAGS</th>
          </tr>
          <tr>
            <th>NET</th>
            <th>GROSS</th>
            <th colSpan={4} rowSpan={2}>{noOfBags}</th>
          </tr>
          <tr>
            <td className="permit-goods-cell">{description}</td>
            <td>{netWeightKg}</td>
            <td>{grossWeightKg}</td>
          </tr>
        </tbody>
      </table>

      <section className="permit-full-marking">
        <strong>FULL MARKING:</strong>
        <pre>{fullMarking}</pre>
      </section>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function SiPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const shipper = value(rows, "Shipper");

  return (
    <article className="print-sheet print-si">
      <header className="doc-header doc-header-stack">
        <div>
          <p className="doc-company">{shipper}</p>
          <p className="doc-meta">SHIPPING INSTRUCTION</p>
        </div>
        <div className="doc-header-right">
          <p className="doc-meta">Document ID: {documentId}</p>
        </div>
      </header>

      <section className="doc-section">
        <table className="print-table">
          <tbody>
            <tr>
              <th>Shipper</th>
              <td>{value(rows, "Shipper")}</td>
            </tr>
            <tr>
              <th>Consignee</th>
              <td>{value(rows, "Consignee")}</td>
            </tr>
            <tr>
              <th>Notify</th>
              <td>{value(rows, "Notify")}</td>
            </tr>
            <tr>
              <th>Second Notify</th>
              <td>{value(rows, "Second Notify")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="doc-section">
        <table className="print-table">
          <tbody>
            <tr>
              <th>Shipping Line</th>
              <td>{value(rows, "Shipping Line")}</td>
              <th>Alternative 1</th>
              <td>{value(rows, "Alternative 1")}</td>
            </tr>
            <tr>
              <th>Alternative 2</th>
              <td>{value(rows, "Alternative 2")}</td>
              <th>Booking Number</th>
              <td>{value(rows, "Booking Number")}</td>
            </tr>
            <tr>
              <th>Port of Loading</th>
              <td>{value(rows, "Port of Loading")}</td>
              <th>Destination</th>
              <td>{value(rows, "Destination")}</td>
            </tr>
            <tr>
              <th>Description</th>
              <td colSpan={3}>{value(rows, "Description")}</td>
            </tr>
            <tr>
              <th>Quantity</th>
              <td>{value(rows, "Quantity")}</td>
              <th>Cert No</th>
              <td>{value(rows, "Cert No")}</td>
            </tr>
            <tr>
              <th>Gross Weight</th>
              <td>{value(rows, "Gross Weight (KG)")}</td>
              <th>Net Weight</th>
              <td>{value(rows, "Net Weight (KG)")}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </article>
  );
}

function indexedValues(rows: Row[], prefix: string): Map<number, string> {
  const values = new Map<number, string>();

  for (const row of rows) {
    if (!row.label.startsWith(prefix)) {
      continue;
    }

    const match = row.label.match(/(\d+)$/);
    if (!match) {
      continue;
    }

    values.set(Number(match[1]), row.value);
  }

  return values;
}

function CertificateOfQualityPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const bags = indexedValues(rows, "Bags per Container ");
  const lineIndexes = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...bags.keys(),
  ])).sort((a, b) => a - b);

  return (
    <article className="print-sheet quality-certificate-sheet">
      <header className="quality-certificate-header">
        <h1>CERTIFICATE OF QUALITY</h1>
        <div className="quality-certificate-meta">
          <p><strong>Date:</strong> {display(value(rows, "Date"))}</p>
          <p><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</p>
        </div>
      </header>

      <p className="quality-certificate-statement">
        {display(value(rows, "Statement"))}
      </p>

      <table className="print-table quality-certificate-table">
        <tbody>
          <tr>
            <th>Mode of Transportation</th>
            <td>{display(value(rows, "Mode of Transportation"))}</td>
          </tr>
          <tr>
            <th>Moisture Content</th>
            <td>{display(value(rows, "Moisture Content"))}</td>
          </tr>
          <tr>
            <th>Shipper</th>
            <td>{display(value(rows, "Shipper"))}</td>
          </tr>
          <tr>
            <th>Notify</th>
            <td>{display(value(rows, "Notify"))}</td>
          </tr>
          <tr>
            <th>2nd Notify</th>
            <td>{display(value(rows, "Second Notify"))}</td>
          </tr>
          <tr>
            <th>Description of Goods</th>
            <td>{display(value(rows, "Description of Goods"))}</td>
          </tr>
          <tr>
            <th>Origin</th>
            <td>{display(value(rows, "Origin"))}</td>
          </tr>
          <tr>
            <th>Quality</th>
            <td>{display(value(rows, "Quality"))}</td>
          </tr>
          <tr>
            <th>ICO No</th>
            <td>{display(value(rows, "ICO No"))}</td>
          </tr>
          <tr>
            <th>Cert No</th>
            <td>{display(value(rows, "Cert No"))}</td>
          </tr>
          <tr>
            <th>Net Weight</th>
            <td>{display(value(rows, "Net Weight"))}</td>
          </tr>
          <tr>
            <th>Gross Weight</th>
            <td>{display(value(rows, "Gross Weight"))}</td>
          </tr>
          <tr>
            <th>Quantity in LB</th>
            <td>{display(value(rows, "Quantity in LB"))}</td>
          </tr>
          <tr>
            <th>From</th>
            <td>{display(value(rows, "From"))}</td>
          </tr>
          <tr>
            <th>To</th>
            <td>{display(value(rows, "To"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table quality-certificate-table mt-sm">
        <thead>
          <tr>
            <th>Container No</th>
            <th>Seal No</th>
            <th>Quantity of Bags per Container</th>
          </tr>
        </thead>
        <tbody>
          {lineIndexes.length > 0 ? (
            lineIndexes.map((index) => (
              <tr key={index}>
                <td>{display(containers.get(index))}</td>
                <td>{display(seals.get(index))}</td>
                <td>{display(bags.get(index))}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No prepared containers in staffing yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="quality-certificate-signatory mt-sm">
        <strong>Signatory Company:</strong> {display(value(rows, "Signatory Company"))}
      </p>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function CertificateOfWeightPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const containers = indexedValues(rows, "Container No ");
  const seals = indexedValues(rows, "Seal No ");
  const bags = indexedValues(rows, "Bags per Container ");
  const bagWeightNet = indexedValues(rows, "Bag Weight Net ");
  const bagWeightGross = indexedValues(rows, "Bag Weight Gross ");
  const containerNetWeight = indexedValues(rows, "Container Net Weight ");
  const containerGrossWeight = indexedValues(rows, "Container Gross Weight ");
  const lineIndexes = Array.from(new Set([
    ...containers.keys(),
    ...seals.keys(),
    ...bags.keys(),
    ...bagWeightNet.keys(),
    ...bagWeightGross.keys(),
    ...containerNetWeight.keys(),
    ...containerGrossWeight.keys(),
  ])).sort((a, b) => a - b);

  return (
    <article className="print-sheet weight-certificate-sheet">
      <header className="weight-certificate-header">
        <h1>CERTIFICATE OF WEIGHT</h1>
        <div className="weight-certificate-meta">
          <p><strong>Date:</strong> {display(value(rows, "Date"))}</p>
          <p><strong>Ref No:</strong> {display(value(rows, "Ref No"))}</p>
        </div>
      </header>

      <table className="print-table weight-certificate-table">
        <tbody>
          <tr>
            <th>Shipper</th>
            <td>{display(value(rows, "Shipper"))}</td>
          </tr>
          <tr>
            <th>Notify</th>
            <td>{display(value(rows, "Notify"))}</td>
          </tr>
          <tr>
            <th>2nd Notify</th>
            <td>{display(value(rows, "Second Notify"))}</td>
          </tr>
          <tr>
            <th>Description of Goods</th>
            <td>{display(value(rows, "Description of Goods"))}</td>
          </tr>
          <tr>
            <th>Net Weight</th>
            <td>{display(value(rows, "Net Weight"))}</td>
          </tr>
          <tr>
            <th>Gross Weight</th>
            <td>{display(value(rows, "Gross Weight"))}</td>
          </tr>
          <tr>
            <th>Packages in Bags</th>
            <td>{display(value(rows, "Packages in Bags"))}</td>
          </tr>
          <tr>
            <th>Origin</th>
            <td>{display(value(rows, "Origin"))}</td>
          </tr>
          <tr>
            <th>Quality</th>
            <td>{display(value(rows, "Quality"))}</td>
          </tr>
          <tr>
            <th>ICO No</th>
            <td>{display(value(rows, "ICO No"))}</td>
          </tr>
          <tr>
            <th>Cert No</th>
            <td>{display(value(rows, "Cert No"))}</td>
          </tr>
          <tr>
            <th>From</th>
            <td>{display(value(rows, "From"))}</td>
          </tr>
          <tr>
            <th>To</th>
            <td>{display(value(rows, "To"))}</td>
          </tr>
        </tbody>
      </table>

      <table className="print-table weight-certificate-table mt-sm">
        <thead>
          <tr>
            <th>Container No</th>
            <th>Seal No</th>
            <th>Quantity of Bags Per Container</th>
            <th>Bag Weight (Net)</th>
            <th>Bag Weight (Gross)</th>
            <th>Container Net Weight (KGS)</th>
            <th>Container Gross Weight (KGS)</th>
          </tr>
        </thead>
        <tbody>
          {lineIndexes.length > 0 ? (
            lineIndexes.map((index) => (
              <tr key={index}>
                <td>{display(containers.get(index))}</td>
                <td>{display(seals.get(index))}</td>
                <td>{display(bags.get(index))}</td>
                <td>{display(bagWeightNet.get(index))}</td>
                <td>{display(bagWeightGross.get(index))}</td>
                <td>{display(containerNetWeight.get(index))}</td>
                <td>{display(containerGrossWeight.get(index))}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>No prepared containers in staffing yet.</td>
            </tr>
          )}
          <tr>
            <td colSpan={5} className="table-align-right"><strong>TOTAL SUM</strong></td>
            <td><strong>{display(value(rows, "Total Net Weight"))}</strong></td>
            <td><strong>{display(value(rows, "Total Gross Weight"))}</strong></td>
          </tr>
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function WayBillPrintView({ output, documentId }: Props) {
  const driverTabs = useMemo(() => output.sections
    .filter((section) => section.heading.startsWith("Driver "))
    .map((section, index) => ({
      key: `${section.heading}-${index + 1}`,
      label: section.heading.replace(/^Driver\s+\d+\s+-\s+/, ""),
      rows: section.rows,
    })), [output.sections]);
  const [activeTab, setActiveTab] = useState(0);
  const activeRows = driverTabs[activeTab]?.rows ?? [];

  return (
    <article className="print-sheet way-bill-sheet">
      <div className="way-bill-tabs screen-only">
        {driverTabs.length > 0 ? (
          driverTabs.map((tab, index) => (
            <button
              key={tab.key}
              type="button"
              className={index === activeTab ? "" : "button-secondary"}
              onClick={() => setActiveTab(index)}
            >
              {tab.label}
            </button>
          ))
        ) : (
          <p>No staffing drivers found yet.</p>
        )}
      </div>

      {driverTabs.length === 0 ? (
        <section className="way-bill-page">
          <p>No Way Bill tabs to display yet. Add driver/truck data in Staffing and generate again.</p>
        </section>
      ) : (
        <section className="way-bill-page">
          <header className="way-bill-header">
            <h1>WAY BILL</h1>
            <div className="way-bill-meta">
              <p><strong>DATE:</strong> {display(value(activeRows, "Date"))}</p>
              <p><strong>REF. No:</strong> {display(value(activeRows, "Ref No"))}</p>
            </div>
          </header>

          <table className="print-table way-bill-table">
            <tbody>
              <tr>
                <th>To:</th>
                <td>{display(value(activeRows, "To"))}</td>
              </tr>
              <tr>
                <th></th>
                <td>{display(value(activeRows, "To Contact"))}</td>
              </tr>
              <tr>
                <th>Truck No:</th>
                <td>{display(value(activeRows, "Truck No"))}</td>
              </tr>
              <tr>
                <th>Trailer No:</th>
                <td>{display(value(activeRows, "Trailer No"))}</td>
              </tr>
              <tr>
                <th>Driver Name:</th>
                <td>{display(value(activeRows, "Driver Name"))}</td>
              </tr>
              <tr>
                <th>Driver Phone No:</th>
                <td>{display(value(activeRows, "Driver Phone No"))}</td>
              </tr>
              <tr>
                <th>License No:</th>
                <td>{display(value(activeRows, "License No"))}</td>
              </tr>
              <tr>
                <th>Final Destination:</th>
                <td>{display(value(activeRows, "Final Destination"))}</td>
              </tr>
            </tbody>
          </table>

          <section className="way-bill-declaration">
            <h3>Driver&apos;s Declaration</h3>
            <p>{display(value(activeRows, "Driver Declaration"))}</p>
          </section>

          <section className="way-bill-conditions">
            <p><strong>{display(value(activeRows, "Terms Intro"))}</strong></p>
            <p>{display(value(activeRows, "Condition 1"))}</p>
            <p>{display(value(activeRows, "Condition 2"))}</p>
            <p>{display(value(activeRows, "Condition 3"))}</p>
          </section>

          <table className="print-table way-bill-table mt-sm">
            <tbody>
              <tr>
                <th colSpan={2}>Detail of Goods</th>
              </tr>
              <tr>
                <th>Description</th>
                <td>{display(value(activeRows, "Detail of Goods"))}</td>
              </tr>
              <tr>
                <th>ICO No</th>
                <td>{display(value(activeRows, "ICO No"))}</td>
              </tr>
              <tr>
                <th>Cert No</th>
                <td>{display(value(activeRows, "Cert No"))}</td>
              </tr>
              <tr>
                <th>No of Bag</th>
                <td>{display(value(activeRows, "No of Bag"))}</td>
              </tr>
              <tr>
                <th>Gross Weight</th>
                <td>{display(value(activeRows, "Gross Weight"))}</td>
              </tr>
              <tr>
                <th>Net Weight</th>
                <td>{display(value(activeRows, "Net Weight"))}</td>
              </tr>
            </tbody>
          </table>

          <table className="print-table way-bill-table mt-sm">
            <tbody>
              <tr>
                <th>{display(value(activeRows, "Transport Charge Label"))}</th>
                <td>{display(value(activeRows, "Transport Charge Per Quantal Label"))}</td>
                <td>{display(value(activeRows, "Transport Charge Total Label"))}</td>
              </tr>
            </tbody>
          </table>

          <table className="print-table way-bill-table mt-sm">
            <thead>
              <tr>
                <th>Container No</th>
                <th>Seal No</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{display(value(activeRows, "Container No 1"))}</td>
                <td>{display(value(activeRows, "Seal No 1"))}</td>
              </tr>
              <tr>
                <td>{display(value(activeRows, "Container No 2"))}</td>
                <td>{display(value(activeRows, "Seal No 2"))}</td>
              </tr>
            </tbody>
          </table>

          <p className="way-bill-amharic">{display(value(activeRows, "Amharic Declaration"))}</p>

          <table className="print-table way-bill-table mt-sm">
            <tbody>
              <tr>
                <th>{display(value(activeRows, "Driver Name Label"))}</th>
                <td>{display(value(activeRows, "Driver Name"))}</td>
              </tr>
              <tr>
                <th>{display(value(activeRows, "Driver Signature Label"))}</th>
                <td>{display(value(activeRows, "Dispatch Signature Label"))}</td>
              </tr>
              <tr>
                <th>{display(value(activeRows, "Driver Date Label"))}</th>
                <td>{display(value(activeRows, "Stamp Date Label"))}</td>
              </tr>
            </tbody>
          </table>

          <p className="permit-doc-id">Document ID: {documentId}</p>
        </section>
      )}
    </article>
  );
}

function DocumentPrintPageFrame(
  {
    children,
    input,
    docType,
  }: {
    children: ReactNode;
    input?: DocumentInputSnapshot;
    docType: DocumentType;
  },
) {
  const companyConfiguration = resolveCompanyConfiguration(input?.contract.orgId ?? "default", input?.companyConfiguration);
  const branding = companyConfiguration.documentBranding;
  const apply = branding.applyByDocType[docType];
  const showHeader = Boolean(apply.header && branding.header.imageDataUrl);
  const showFooter = Boolean(apply.footer && branding.footer.imageDataUrl);

  const style = {
    "--brand-header-height": showHeader ? `${branding.header.heightMm}mm` : "0mm",
    "--brand-footer-height": showFooter ? `${branding.footer.heightMm}mm` : "0mm",
  } as CSSProperties;

  return (
    <article className="document-branded-page" style={style}>
      {showHeader ? (
        <div className="document-brand-slot document-brand-slot-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.header.imageDataUrl}
            alt="Document header"
            style={{
              objectFit: branding.header.fit,
              objectPosition: `${branding.header.positionXPercent}% ${branding.header.positionYPercent}%`,
            }}
          />
        </div>
      ) : null}

      <div className="document-branded-content">
        {children}
      </div>

      {showFooter ? (
        <div className="document-brand-slot document-brand-slot-bottom">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.footer.imageDataUrl}
            alt="Document footer"
            style={{
              objectFit: branding.footer.fit,
              objectPosition: `${branding.footer.positionXPercent}% ${branding.footer.positionYPercent}%`,
            }}
          />
        </div>
      ) : null}
    </article>
  );
}

export function DocumentPrintTemplate({
  output,
  documentId,
  input,
  isFinal = false,
}: Props) {
  let content: ReactNode;

  if (output.docType === "invoice") {
    content = <IccInvoicePrintView output={output} documentId={documentId} input={input} isFinal={isFinal} />;
  } else if (output.docType === "packing_list") {
    if (output.docVariant === "permit") {
      content = <PermitPackingListPrintView output={output} documentId={documentId} input={input} />;
    } else {
      content = <PackingListIccPrintView output={output} documentId={documentId} input={input} isFinal={isFinal} />;
    }
  } else if (output.docType === "quality_certificate") {
    content = <CertificateOfQualityPrintView output={output} documentId={documentId} input={input} />;
  } else if (output.docType === "weight_certificate") {
    content = <CertificateOfWeightPrintView output={output} documentId={documentId} input={input} />;
  } else if (output.docType === "way_bill") {
    content = <WayBillPrintView output={output} documentId={documentId} input={input} />;
  } else {
    content = <SiPrintView output={output} documentId={documentId} input={input} />;
  }

  return (
    <DocumentPrintPageFrame input={input} docType={output.docType}>
      {content}
    </DocumentPrintPageFrame>
  );
}
