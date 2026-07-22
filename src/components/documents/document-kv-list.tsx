type DocumentKvRow = {
  label: string;
  value: string;
};

export function renderDocumentValue(value: string) {
  return value && value.trim() !== "" ? value : "—";
}

export function documentValueClass(label: string, value: string) {
  if (/\r?\n/.test(value) || /marking/i.test(label)) {
    return "document-kv-item__value preserve-linebreaks";
  }

  return "document-kv-item__value";
}

export function DocumentKvList({
  rows,
}: {
  rows: DocumentKvRow[];
}) {
  return (
    <dl className="document-kv-list">
      {rows.map((row) => (
        <div key={row.label} className="document-kv-item">
          <dt className="document-kv-item__label">{row.label}</dt>
          <dd className={documentValueClass(row.label, row.value)}>{renderDocumentValue(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DocumentPreviewBlock({
  heading,
  rows,
}: {
  heading: string;
  rows: DocumentKvRow[];
}) {
  return (
    <section className="document-preview-block">
      <h4 className="document-preview-block__title">{heading}</h4>
      <DocumentKvList rows={rows} />
    </section>
  );
}
