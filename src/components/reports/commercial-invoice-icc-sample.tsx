"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import { CenteredLoader } from "@/components/ui/centered-loader";

type CommercialInvoiceIccSample = {
  contractId: string;
  contractNumber: string;
  header: {
    date: string;
    refNo: string;
    salesContractRef: string;
    salesContractDate: string;
    exporterBeneficiarySeller: string;
    bankPermitNumber: string;
    billOfLadingNumber: string;
    methodOfDispatch: string;
    vesselAndVoyageNumber: string;
    shippedOnBoardDate: string;
    applicantNotify: string;
    consignee: string;
    eccsaCertificateOfOriginNumber: string;
  };
  goodsLine: {
    descriptionOfGoods: string;
    hsCode: string;
    quantityLbNet: string;
    quantityKgNet: string;
    quantityKgGross: string;
    packagesInBags: string;
    unitPriceUscPerLb: string;
    totalPriceUsd: string;
    totalAmountUsd: string;
    amountInWords: string;
  };
  bank: {
    bankOfBeneficiary: string;
    beneficiaryBankAddress: string;
    swiftNumber: string;
    beneficiaryName: string;
    beneficiaryAccountNumber: string;
    correspondentBankName: string;
    correspondentBankAddress: string;
    correspondentSwiftNumber: string;
    correspondentAccountNumber: string;
  };
  footer: {
    countryOfOrigin: string;
    placeOfIssue: string;
    portOfLoading: string;
    portOfDischarge: string;
    finalDestination: string;
    dateOfIssue: string;
    deliveryTradeTerm: string;
    typeOfShipment: string;
    incoterm: string;
    termMethodOfPayment: string;
    packagingAndMarkingLabel: string;
    fullMarking: string;
  };
  mappingNotes: string[];
};

interface CommercialInvoiceIccSampleViewProps {
  initialContractId?: string;
}

function display(value: string | undefined): string {
  return value && value.trim() !== "" ? value : "-";
}

export function CommercialInvoiceIccSampleView({
  initialContractId,
}: CommercialInvoiceIccSampleViewProps) {
  const [contractId, setContractId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState<CommercialInvoiceIccSample | null>(null);

  async function loadSample(targetContractId: string) {
    const normalizedId = targetContractId.trim();
    if (!normalizedId) {
      setError("Contract ID is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient<CommercialInvoiceIccSample>(
        `/api/contracts/${normalizedId}/commercial-invoice-icc?orgId=${DEFAULT_ORG_ID}`,
      );
      setSample(data);
      setContractId(data.contractId);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("evodoc.contractId", data.contractId);
      }
    } catch (loadError) {
      setError((loadError as Error).message);
      setSample(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const queryContractId = initialContractId ?? (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("contractId")
      : null);
    const rememberedContractId =
      typeof window !== "undefined" ? window.localStorage.getItem("evodoc.contractId") : null;
    const initial = queryContractId ?? rememberedContractId ?? "";

    if (!initial) {
      return;
    }

    setContractId(initial);
    void loadSample(initial);
  }, [initialContractId]);

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Commercial Invoice (ICC) Preview</h1>
        <p>Preview the invoice output using the current contract data.</p>
      </header>

      <section className="card">
        <div className="row-actions">
          <label className="minw-320">
            Contract ID
            <input value={contractId} onChange={(event) => setContractId(event.target.value)} />
          </label>
          <button type="button" onClick={() => void loadSample(contractId)} disabled={loading}>
            {loading ? "Loading..." : "Load Preview"}
          </button>
          {sample ? (
            <button type="button" className="button-secondary" onClick={() => window.print()}>Print Preview</button>
          ) : null}
        </div>
        {error ? <p className="error-text mt-md">{error}</p> : null}
        {loading && !sample ? <CenteredLoader label="Loading preview..." scope="inline" /> : null}
      </section>

      {sample ? (
        <article className="print-sheet icc-sheet">
          <table className="print-table icc-table">
            <tbody>
              <tr>
                <td colSpan={5}><strong>COMMERCIAL INVOICE</strong></td>
                <td colSpan={5} className="table-align-right"><strong>PAGE 1 OF 1 | ORIGINAL</strong></td>
              </tr>
              <tr>
                <td colSpan={5}><strong>Date:</strong> {display(sample.header.date)}</td>
                <td colSpan={3}><strong>Sales Contract Ref:</strong> {display(sample.header.salesContractRef)}</td>
                <td colSpan={2}><strong>Ref No:</strong> {display(sample.header.refNo)}</td>
              </tr>
              <tr>
                <td colSpan={5}><strong>Ref No:</strong> {display(sample.header.refNo)}</td>
                <td colSpan={5}><strong>Sales Contract Date:</strong> {display(sample.header.salesContractDate)}</td>
              </tr>
              <tr>
                <td colSpan={5}><strong>Exporter/Beneficiary/Seller</strong><br />{display(sample.header.exporterBeneficiarySeller)}</td>
                <td colSpan={5}><strong>Bank Permit Number:</strong> {display(sample.header.bankPermitNumber)}</td>
              </tr>
              <tr>
                <td colSpan={5}><strong>Applicant/Notify</strong><br />{display(sample.header.applicantNotify)}</td>
                <td colSpan={5}><strong>Bill of Lading Number:</strong> {display(sample.header.billOfLadingNumber)}</td>
              </tr>
              <tr>
                <td colSpan={5}><strong>Consignee</strong><br />{display(sample.header.consignee)}</td>
                <td colSpan={5}><strong>Method of Dispatch:</strong> {display(sample.header.methodOfDispatch)}</td>
              </tr>
              <tr>
                <td colSpan={5}><strong>ECCSA - Certificate of Origin Number:</strong> {display(sample.header.eccsaCertificateOfOriginNumber)}</td>
                <td colSpan={5}><strong>Vessel &amp; Voyage Number:</strong> {display(sample.header.vesselAndVoyageNumber)}</td>
              </tr>
              <tr>
                <td colSpan={5}></td>
                <td colSpan={5}><strong>Shipped on Board Date:</strong> {display(sample.header.shippedOnBoardDate)}</td>
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
                <td>{display(sample.goodsLine.descriptionOfGoods)}</td>
                <td>{display(sample.goodsLine.hsCode)}</td>
                <td>{display(sample.goodsLine.quantityLbNet)}</td>
                <td>{display(sample.goodsLine.quantityKgNet)}</td>
                <td>{display(sample.goodsLine.quantityKgGross)}</td>
                <td>{display(sample.goodsLine.packagesInBags)}</td>
                <td>{display(sample.goodsLine.unitPriceUscPerLb)}</td>
                <td>{display(sample.goodsLine.totalPriceUsd)}</td>
              </tr>
              <tr>
                <td colSpan={8} className="table-align-right"><strong>TOTAL AMOUNT IN USD</strong></td>
                <td><strong>{display(sample.goodsLine.totalAmountUsd)}</strong></td>
              </tr>
              <tr>
                <td colSpan={9}><strong>AMOUNT IN WORDS:</strong> {display(sample.goodsLine.amountInWords)}</td>
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
                <td colSpan={3}><strong>Bank of Beneficiary:</strong> {display(sample.bank.bankOfBeneficiary)}</td>
                <td colSpan={2}><strong>Address of Bank:</strong> {display(sample.bank.beneficiaryBankAddress)}</td>
                <td colSpan={2}><strong>Bank Name:</strong> {display(sample.bank.correspondentBankName)}</td>
                <td colSpan={2}><strong>Address:</strong> {display(sample.bank.correspondentBankAddress)}</td>
              </tr>
              <tr>
                <td colSpan={3}><strong>Name of Beneficiary:</strong> {display(sample.bank.beneficiaryName)}</td>
                <td colSpan={2}><strong>SWIFT Number:</strong> {display(sample.bank.swiftNumber)}</td>
                <td colSpan={2}><strong>SWIFT Number:</strong> {display(sample.bank.correspondentSwiftNumber)}</td>
                <td colSpan={2}><strong>Acc. No:</strong> {display(sample.bank.correspondentAccountNumber)}</td>
              </tr>
              <tr>
                <td colSpan={5}><strong>Beneficiaries Acc. No:</strong> {display(sample.bank.beneficiaryAccountNumber)}</td>
                <td colSpan={4}></td>
              </tr>
            </tbody>
          </table>

          <table className="print-table icc-table mt-sm">
            <tbody>
              <tr>
                <td><strong>Country of Origin:</strong> {display(sample.footer.countryOfOrigin)}</td>
                <td><strong>Place of Issue:</strong> {display(sample.footer.placeOfIssue)}</td>
              </tr>
              <tr>
                <td><strong>Port of Loading:</strong> {display(sample.footer.portOfLoading)}</td>
                <td><strong>Date of Issue:</strong> {display(sample.footer.dateOfIssue)}</td>
              </tr>
              <tr>
                <td><strong>Port of Discharge:</strong> {display(sample.footer.portOfDischarge)}</td>
                <td><strong>Signatory Company:</strong> -</td>
              </tr>
              <tr>
                <td><strong>Final Destination:</strong> {display(sample.footer.finalDestination)}</td>
                <td><strong>Name of Authorized Signatory:</strong> -</td>
              </tr>
              <tr>
                <td><strong>Delivery/Trade Term:</strong> {display(sample.footer.deliveryTradeTerm)}</td>
                <td rowSpan={2}>
                  We hereby certify that this invoice is in all respects correct and true, as regards to both
                  the prices and description of the goods referred to herein, and that the country of origin
                  of the goods is Ethiopia.
                </td>
              </tr>
              <tr>
                <td><strong>Type of Shipment:</strong> {display(sample.footer.typeOfShipment)}</td>
              </tr>
              <tr>
                <td><strong>Incoterm:</strong> {display(sample.footer.incoterm)}</td>
                <td><strong>Authorized Signature &amp; Company Seal/Stamp</strong></td>
              </tr>
              <tr>
                <td><strong>Term/Method of Payment:</strong> {display(sample.footer.termMethodOfPayment)}</td>
                <td></td>
              </tr>
              <tr>
                <td className="preserve-linebreaks"><strong>Packaging &amp; Marking (Label):</strong> {display(sample.footer.packagingAndMarkingLabel)}</td>
                <td></td>
              </tr>
              <tr>
                <td className="preserve-linebreaks"><strong>FULL MARKING</strong><br />{display(sample.footer.fullMarking)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </article>
      ) : null}

    </section>
  );
}
