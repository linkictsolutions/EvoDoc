"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { DEFAULT_ORG_ID } from "@/lib/config";
import type { AuditLog } from "@/types/models";

export default function ContractActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.resolve(params)
      .then(async ({ id }) => {
        const data = await apiClient<AuditLog[]>(`/api/contracts/${id}/activity?orgId=${DEFAULT_ORG_ID}`);
        if (mounted) {
          setLogs(data);
        }
      })
      .catch((loadError: Error) => {
        if (mounted) {
          setError(loadError.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, [params]);

  if (error) {
    return <section className="card"><p className="error-text">{error}</p></section>;
  }

  return (
    <section className="page-shell">
      <header className="page-header">
        <h1>Activity</h1>
        <p>Recent contract-level write events, document generation actions, and workflow transitions.</p>
      </header>

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={4}>No activity yet.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td>{log.actorUid}</td>
                    <td><code>{log.targetPath}</code></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
