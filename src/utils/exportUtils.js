// Utility to export table data to CSV/Excel with UTF-8 BOM
export function exportToCSV(filename, headers, rows) {
  // \uFEFF ensures Excel recognizes UTF-8 (accents like ç, ã, é, ó)
  let csvContent = '\uFEFF';
  
  // Headers row
  csvContent += headers.map(h => `"${(h || '').replace(/"/g, '""')}"`).join(';') + '\r\n';

  // Data rows
  rows.forEach(row => {
    const line = row.map(val => {
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    }).join(';');
    csvContent += line + '\r\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
