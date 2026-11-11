

export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val == null) return "";
    let value = String(val);
    if (typeof val !== "number" && /^[\t\r ]*[=+\-@]/.test(value)) {
      value = `'${value}`;
    }
    return `"${value.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\r\n");


  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
