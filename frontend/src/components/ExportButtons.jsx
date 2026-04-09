export const ExportButtons = ({ onExportPDF, onExportXLSX, loading = false }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={onExportPDF}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 text-sm font-semibold
          bg-rose-600 text-white rounded-lg shadow-sm shadow-rose-600/20
          hover:bg-rose-700 hover:-translate-y-px
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2
          disabled:opacity-50 transition-all duration-200"
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        Export PDF
      </button>
      <button
        onClick={onExportXLSX}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 text-sm font-semibold
          bg-emerald-600 text-white rounded-lg shadow-sm shadow-emerald-600/20
          hover:bg-emerald-700 hover:-translate-y-px
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2
          disabled:opacity-50 transition-all duration-200"
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        Export XLSX
      </button>
    </div>
  );
};

export default ExportButtons;
