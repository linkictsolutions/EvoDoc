import type { DocumentOutputSnapshot } from "@/types/models";

type Props = {
  output: DocumentOutputSnapshot;
  documentId: string;
};

type Row = { label: string; value: string };

function flattenRows(output: DocumentOutputSnapshot): Row[] {
  return output.sections.flatMap((section) => section.rows);
}

function value(rows: Row[], label: string): string {
  return rows.find((row) => row.label === label)?.value ?? "-";
}

function InvoicePrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);

  return (
    <article className="print-sheet print-invoice">
      <header className="doc-header doc-header-stack">
        <div>
          <p className="doc-company">PRAXIS INTERNATIONAL BUSINESS PLC</p>
          <p className="doc-meta">Nifas Silk Lafto Sub City, Woreda 08, Addis Ababa, Ethiopia</p>
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

  return (
    <article className="print-sheet print-packing">
      <header className="doc-header doc-header-stack">
        <div>
          <p className="doc-company">PRAXIS INTERNATIONAL BUSINESS PLC</p>
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

function SiPrintView({ output, documentId }: Props) {
  const rows = flattenRows(output);

  return (
    <article className="print-sheet print-si">
      <header className="doc-header doc-header-stack">
        <div>
          <p className="doc-company">PRAXIS INTERNATIONAL BUSINESS PLC</p>
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

export function DocumentPrintTemplate({ output, documentId }: Props) {
  if (output.docType === "invoice") {
    return <InvoicePrintView output={output} documentId={documentId} />;
  }

  if (output.docType === "packing_list") {
    return <PackingListPrintView output={output} documentId={documentId} />;
  }

  return <SiPrintView output={output} documentId={documentId} />;
}
