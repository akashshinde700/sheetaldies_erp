import { useState, useRef, useEffect } from 'react';

/**
 * SearchSelect — searchable combobox replacing <select>
 *
 * Props:
 *   value       — current selected id/value (string or number)
 *   onChange    — called with the selected value string
 *   options     — [{ value, label }]
 *   placeholder — text when nothing selected
 *   required    — boolean
 *   className   — extra classes on the wrapper
 */
export default function SearchSelect({
  value, onChange, options = [], placeholder = '— Select —',
  required = false, className = '',
}) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Label of currently selected option
  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || '';

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleOpen = () => {
    setOpen(true);
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSelect = (opt) => {
    onChange(String(opt.value));
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger / Display */}
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`form-input w-full text-left flex items-center justify-between gap-2 ${!value ? 'text-slate-400' : 'text-slate-800'}`}
        >
          <span className="truncate text-sm">{value ? selectedLabel : placeholder}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && (
              <span
                onClick={handleClear}
                className="material-symbols-outlined text-[16px] text-slate-300 hover:text-rose-400 transition-colors"
              >close</span>
            )}
            <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
          </div>
        </button>
      ) : (
        /* Search Input */
        <div className="form-input flex items-center gap-2 p-0 overflow-hidden">
          <span className="material-symbols-outlined text-slate-400 text-[16px] ml-3 flex-shrink-0">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type to search..."
            className="flex-1 py-2 pr-3 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
            onKeyDown={e => {
              if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              if (e.key === 'Enter' && filtered.length === 1) { handleSelect(filtered[0]); }
            }}
          />
        </div>
      )}

      {/* Hidden native input for required validation */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value || ''}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none w-full"
        />
      )}

      {/* Dropdown List */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">No results found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 ${
                    String(opt.value) === String(value) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  {String(opt.value) === String(value) && (
                    <span className="material-symbols-outlined text-[14px] text-indigo-500 flex-shrink-0">check</span>
                  )}
                  <span className={String(opt.value) === String(value) ? '' : 'ml-[22px]'}>{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
