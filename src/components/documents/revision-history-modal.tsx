"use client";

import Link from "next/link";
import { ModalPanel } from "@/components/ui/modal-panel";

type RevisionRow = {
  id: string;
  revisionNumber: number;
  status: string;
  generatedAt: string;
  isFinal: boolean;
};

export function RevisionHistoryModal({
  open,
  onClose,
  revisions,
  contractId,
  family,
}: {
  open: boolean;
  onClose: () => void;
  revisions: RevisionRow[];
  contractId: string;
  family: string;
}) {
  return (
    <ModalPanel
      open={open}
      onClose={onClose}
      title="Revision History"
      description="Previous generated versions for this document."
      wide
      className="revision-history-modal"
    >
      <div className="revision-history-table-wrap table-wrap">
        <table className="revision-history-table">
          <thead>
            <tr>
              <th>Revision</th>
              <th>Version</th>
              <th>Status</th>
              <th>Generated</th>
              <th className="table-align-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {revisions.length === 0 ? (
              <tr>
                <td colSpan={5} className="revision-history-table__empty">
                  No revisions yet.
                </td>
              </tr>
            ) : (
              revisions.map((revision) => (
                <tr key={revision.id}>
                  <td className="revision-history-table__revision">v{revision.revisionNumber}</td>
                  <td>
                    <span className={`status-pill ${revision.isFinal ? "status-approved" : "status-draft"}`}>
                      {revision.isFinal ? "Final" : "Draft"}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill status-${revision.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {revision.status}
                    </span>
                  </td>
                  <td className="revision-history-table__date">
                    {new Date(revision.generatedAt).toLocaleString()}
                  </td>
                  <td className="table-align-right">
                    <Link
                      href={`/app/contracts/${contractId}/documents/generated/${revision.id}/review?family=${family}`}
                      className="button-link button-link-secondary revision-history-table__open"
                      onClick={onClose}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ModalPanel>
  );
}
