import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * SearchSelect — searchable combobox replacing <select>
 *
 * Props:
 *   value       — current selected id/value (string or number)
 *   onChange    — called with the selected value string
 *   options     — [{ value, label }]
 *   placeholder — text when nothing selected
 *   required    — boolean
 *   disabled    — boolean
 *   className   — extra classes on the wrapper
 *   useFixed    — use position:fixed for dropdown (needed inside overflow:hidden/auto containers like tables)
 */
export default function SearchSelect({
  value, onChange, options = [], placeholder = '— Select —',
  required = false, disabled = false, className = '', useFixed = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState({});
  const wrapRef   = useRef(null);
  const inputRef  = useRef(null);
  const buttonRef = useRef(null);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label || '';

  // Click-outside close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reposition fixed menu on scroll/resize
  const updateMenuPosition = useCallback(() => {
    if (!useFixed || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [useFixed]);

  useEffect(() => {
    if (!open || !useFixed) return;
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, useFixed, updateMenuPosition]);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => { setHighlightedIndex(0); }, [filtered.length, open]);

  const handleOpen = () => {
    if (disabled) return;
    if (useFixed && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
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

  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(p => Math.min(p + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightedIndex(p => Math.max(p - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0 && filtered[highlightedIndex]) handleSelect(filtered[highlightedIndex]);
    }
  };

  const dropdownContent = open && (
    <div
      className={useFixed ? '' : 'absolute z-50 top-full left-0 right-0 mt-1.5'}
      style={useFixed ? menuStyle : undefined}
    >
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-card-hover overflow-hidden">
        <div className="max-h-[min(14rem,50dvh)] overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <div className="px-4 py-4 text-xs text-slate-500 text-center">No results found</div>
          ) : (
            filtered.map((opt, index) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left min-h-[44px] px-4 py-2.5 text-sm flex items-center gap-2 transition-colors duration-150
                  active:bg-brand-100/80
                  ${index === highlightedIndex ? 'bg-slate-100' : ''}
                  ${String(opt.value) === String(value)
                    ? 'bg-brand-50 text-brand-900 font-semibold'
                    : 'text-slate-800 hover:bg-brand-50/80 hover:text-brand-900'}`}
              >
                {String(opt.value) === String(value) && (
                  <span className="material-symbols-outlined text-[14px] text-brand-600 flex-shrink-0">check</span>
                )}
                <span className={String(opt.value) === String(value) ? '' : 'ml-[22px]'}>{opt.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {!open ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleOpen}
          disabled={disabled}
          className={`form-input w-full text-left flex items-center justify-between gap-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${!value ? 'text-slate-500' : 'text-slate-900'}`}
        >
          <span className="truncate text-sm">{value ? selectedLabel : placeholder}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClear(e); } }}
                className="material-symbols-outlined text-[16px] text-slate-400 hover:text-rose-500 transition-colors"
              >
                close
              </span>
            )}
            <span className="material-symbols-outlined text-[16px] text-slate-500">expand_more</span>
          </div>
        </button>
      ) : (
        <div className="form-input flex items-center gap-2 p-0 overflow-hidden">
          <span className="material-symbols-outlined text-slate-500 text-[16px] ml-3 flex-shrink-0">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type to search..."
            autoComplete="off"
            className="flex-1 py-2 pr-3 text-sm bg-transparent outline-none text-slate-900 placeholder-slate-400"
            onKeyDown={handleInputKeyDown}
          />
        </div>
      )}

      {required && (
        <input
          tabIndex={-1}
          required
          value={value || ''}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none w-full"
        />
      )}

      {/* For fixed mode, portal not needed — fixed positioning escapes overflow */}
      {!useFixed && dropdownContent}
      {useFixed && dropdownContent}
    </div>
  );
}
