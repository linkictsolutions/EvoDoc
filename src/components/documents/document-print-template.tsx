import type { CSSProperties, ReactNode } from "react";
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

      <table className="print-table icc-table mt-sm">
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
            <td><strong>Packaging &amp; Marking (Label):</strong> {display(value(rows, "Packaging & Marking (Label)"))}</td>
            <td></td>
          </tr>
          <tr>
            <td><strong>FULL MARKING</strong><br />{display(value(rows, "Full Marking"))}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <p className="permit-doc-id">Document ID: {documentId}</p>
    </article>
  );
}

function PackingListPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const shipper = value(rows, "Shipper");

  return (
    <article className="print-sheet print-packing">
      <header className="doc-header doc-header-stack">
        <div>
          <p className="doc-company">{shipper}</p>
          <p className="doc-meta">PACKING LIST CERTIFICATE</p>
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
              <th>Applicant</th>
              <td>{value(rows, "Applicant")}</td>
            </tr>
            <tr>
              <th>Consignee</th>
              <td>{value(rows, "Consignee")}</td>
              <th>Contract Ref</th>
              <td>{value(rows, "Contract Ref")}</td>
            </tr>
            <tr>
              <th>Vessel</th>
              <td>{value(rows, "Vessel")}</td>
              <th>Voyage</th>
              <td>{value(rows, "Voyage")}</td>
            </tr>
            <tr>
              <th>Booking Number</th>
              <td>{value(rows, "Booking Number")}</td>
              <th>Description</th>
              <td>{value(rows, "Description")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="doc-section">
        <table className="print-table">
          <thead>
            <tr>
              <th>No. Bags</th>
              <th>Containers</th>
              <th>Bags / Container</th>
              <th>Gross Weight (MT)</th>
              <th>Net Weight (MT)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{value(rows, "No of Bags")}</td>
              <td>{value(rows, "Container Count")}</td>
              <td>{value(rows, "Bags per Container")}</td>
              <td>{value(rows, "Gross Weight (MT)")}</td>
              <td>{value(rows, "Net Weight (MT)")}</td>
            </tr>
          </tbody>
        </table>
      </section>
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
            <td colSpan={6}>{packagingMarking}</td>
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
      content = <PackingListPrintView output={output} documentId={documentId} input={input} />;
    }
  } else {
    content = <SiPrintView output={output} documentId={documentId} input={input} />;
  }

  return (
    <DocumentPrintPageFrame input={input} docType={output.docType}>
      {content}
    </DocumentPrintPageFrame>
  );
}
