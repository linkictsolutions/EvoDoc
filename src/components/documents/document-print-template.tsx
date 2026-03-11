import type { DocumentInputSnapshot, DocumentOutputSnapshot } from "@/types/models";

type Props = {
  output: DocumentOutputSnapshot;
  documentId: string;
  input?: DocumentInputSnapshot;
};

type Row = { label: string; value: string };

function flattenRows(output: DocumentOutputSnapshot): Row[] {
  return output.sections.flatMap((section) => section.rows);
}

function value(rows: Row[], label: string): string {
  return rows.find((row) => row.label === label)?.value ?? "-";
}

function PermitInvoicePrintView({ output, documentId, input }: Props) {
  const rows = flattenRows(output);
  const shipper = value(rows, "Shipper");
  const applicant = value(rows, "Applicant");
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
  const quantityLb = value(rows, "Quantity (LB)");
  const netWeightKg = value(rows, "Net Weight (KG)");
  const grossWeightKg = value(rows, "Gross Weight (KG)");
  const noOfBags = value(rows, "No of Bags");
  const unitPrice = value(rows, "Unit Price");
  const totalPrice = value(rows, "Total Price");
  const amountInWords = value(rows, "Amount in Words");
  const bankOfBeneficiary = value(rows, "Bank of Beneficiary");
  const bankAddress = value(rows, "Beneficiary Bank Address");
  const swiftNumber = value(rows, "SWIFT Number");
  const beneficiaryAccountNumber = value(rows, "Beneficiary Account Number");
  const fullMarking = value(rows, "Full Marking");
  const sellerName = input?.companyConfiguration?.sellerName ?? shipper.split(",")[0] ?? shipper;

  return (
    <article className="print-sheet permit-invoice-sheet">
      <header className="permit-invoice-title">
        <h1>COMMERCIAL INVOICE</h1>
      </header>

      <table className="print-table permit-invoice-table">
        <tbody>
          <tr>
            <th>SHIPPER</th>
            <td colSpan={6}>{shipper}</td>
          </tr>
          <tr>
            <th>APPLICANTS NAME</th>
            <td colSpan={6}>{applicant}</td>
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
            <th>DELIVEY TERM</th>
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
            <th>QUANTITY IN LB</th>
            <th colSpan={2}>QUANTITY IN KG</th>
            <th>PACKAGES IN BAGS</th>
            <th>UNIT PRICE USC/LB</th>
            <th>TOTAL AMOUNT IN USD</th>
          </tr>
          <tr>
            <th>NET</th>
            <th>NET</th>
            <th>GROSS</th>
            <th rowSpan={2}>{noOfBags}</th>
            <th rowSpan={2}>{unitPrice}</th>
            <th rowSpan={2}>{totalPrice}</th>
          </tr>
          <tr>
            <td className="permit-goods-cell">{description}</td>
            <td>{quantityLb}</td>
            <td>{netWeightKg}</td>
            <td>{grossWeightKg}</td>
          </tr>
          <tr>
            <th>TOTAL USD</th>
            <td colSpan={6}>{amountInWords}</td>
          </tr>
          <tr>
            <th colSpan={7}>BENEFICIARY ACCOUNT DETAILS</th>
          </tr>
          <tr>
            <th>BANK OF BENEFICIARY:</th>
            <td colSpan={6}>{bankOfBeneficiary}</td>
          </tr>
          <tr>
            <th>ADDRESS OF BANK:</th>
            <td colSpan={6}>{bankAddress}</td>
          </tr>
          <tr>
            <th>SWIFT NUMBER:</th>
            <td colSpan={6}>{swiftNumber}</td>
          </tr>
          <tr>
            <th>NAME OF BENEFICIARY (ACC. NAME):</th>
            <td colSpan={6}>{sellerName}</td>
          </tr>
          <tr>
            <th>BENEFICIERIES ACC. NO:</th>
            <td colSpan={6}>{beneficiaryAccountNumber}</td>
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

function InvoicePrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);
  const shipper = value(rows, "Shipper");

  return (
    <article className="print-sheet print-invoice">
      <header className="doc-header doc-header-stack">
        <div>
          <p className="doc-company">{shipper}</p>
        </div>
        <div className="doc-header-right">
          <p className="doc-meta">COMMERCIAL INVOICE</p>
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
              <th>Contract Ref</th>
              <td>{value(rows, "Contract Ref")}</td>
              <th>Contract Date</th>
              <td>{value(rows, "Contract Date")}</td>
            </tr>
            <tr>
              <th>Payment Term</th>
              <td>{value(rows, "Payment Term")}</td>
              <th>Delivery Term</th>
              <td>{value(rows, "Delivery Term")}</td>
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
          </tbody>
        </table>
      </section>

      <section className="doc-section">
        <table className="print-table">
          <thead>
            <tr>
              <th>No. Bags</th>
              <th>Quantity (LB)</th>
              <th>Net Weight (KG)</th>
              <th>Gross Weight (KG)</th>
              <th>Unit Price</th>
              <th>Total Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{value(rows, "No of Bags")}</td>
              <td>{value(rows, "Quantity (LB)")}</td>
              <td>{value(rows, "Net Weight (KG)")}</td>
              <td>{value(rows, "Gross Weight (KG)")}</td>
              <td>{value(rows, "Unit Price")}</td>
              <td>{value(rows, "Total Price")}</td>
            </tr>
            <tr>
              <th>Amount in Words</th>
              <td colSpan={5}>{value(rows, "Amount in Words")}</td>
            </tr>
          </tbody>
        </table>
      </section>
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

export function DocumentPrintTemplate({ output, documentId, input }: Props) {
  if (output.docType === "invoice" && output.docVariant === "permit") {
    return <PermitInvoicePrintView output={output} documentId={documentId} input={input} />;
  }

  if (output.docType === "invoice") {
    return <InvoicePrintView output={output} documentId={documentId} />;
  }

  if (output.docType === "packing_list") {
    if (output.docVariant === "permit") {
      return <PermitPackingListPrintView output={output} documentId={documentId} input={input} />;
    }

    return <PackingListPrintView output={output} documentId={documentId} input={input} />;
  }

  return <SiPrintView output={output} documentId={documentId} input={input} />;
}
