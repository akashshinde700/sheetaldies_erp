import React from 'react';
import { Download } from 'lucide-react';

export const ExportButtons = ({ onExportPDF, onExportXLSX, loading = false }) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={onExportPDF}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
      >
        <Download size={18} />
        Export PDF
      </button>
      <button
        onClick={onExportXLSX}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
      >
        <Download size={18} />
        Export XLSX
      </button>
    </div>
  );
};

export default ExportButtons;
