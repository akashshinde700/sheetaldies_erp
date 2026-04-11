import * as XLSX from 'xlsx';

export function exportToExcel(rows: any[], filename: string = 'export'): void {
  if (!rows || !rows.length) {
    throw new Error('No data to export');
  }

  const worksheet = XLSX.utils.json_to_sheet(rows, { dateNF: 'yyyy-mm-dd' });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export function exportToCsv(rows: Record<string, any>[], filename: string = 'export'): void {
  if (!rows || !rows.length) {
    throw new Error('No data to export');
  }

  const header = Object.keys(rows[0]);
  const csvContent = [header.join(','), ...rows.map(row => header.map(field => {
    const value = row[field] ?? '';
    if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
