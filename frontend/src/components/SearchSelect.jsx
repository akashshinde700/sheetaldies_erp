import { useState, useRef, useEffect, useCallback, useId } from 'react';

// Fixed-position dropdown floor width — keeps long option labels (e.g. long
// process names) readable even when the trigger itself is a narrow table cell.
const MIN_MENU_WIDTH = 260;

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
 *   dense       — smaller text/row-height for cramped table cells (e.g. process columns)
 */
export default function SearchSelect({
  value, onChange, options = [], placeholder = '— Select —',
  required = false, disabled = false, className = '', useFixed = false, dense = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState({});
  const wrapRef   = useRef(null);
  const inputRef  = useRef(null);
  const buttonRef = useRef(null);
  const rid = useId();
  const listboxId = `ss-list-${rid}`;
  const optionId = (i) => `ss-opt-${rid}-${i}`;

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

  // Reposition fixed menu on scroll/resize. The menu is at least
  // MIN_MENU_WIDTH wide regardless of the trigger's own width — a narrow
  // table-cell trigger (e.g. a compact "Process" column) would otherwise
  // force long option labels to wrap illegibly inside a tiny popup.
  const computeMenuStyle = useCallback((rect) => {
    const width = Math.max(rect.width, MIN_MENU_WIDTH);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    return {
      position: 'fixed',
      top: rect.bottom + 4,
      left: Math.max(8, left),
      width,
      zIndex: 9999,
    };
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!useFixed || !buttonRef.current) return;
    setMenuStyle(computeMenuStyle(buttonRef.current.getBoundingClientRect()));
  }, [useFixed, computeMenuStyle]);

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
      setMenuStyle(computeMenuStyle(buttonRef.current.getBoundingClientRect()));
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
        <ul
          role="listbox"
          id={listboxId}
          aria-label={placeholder}
          className="max-h-[min(14rem,50dvh)] overflow-y-auto overscroll-contain m-0 list-none p-0"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-4 text-xs text-slate-500 text-center">No results found</li>
          ) : (
            filtered.map((opt, index) => (
              <li key={opt.value} role="none">
              <button
                type="button"
                role="option"
                id={optionId(index)}
                aria-selected={String(opt.value) === String(value)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left flex items-center gap-2 transition-colors duration-150
                  ${dense ? 'min-h-[28px] px-2.5 py-1 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'}
                  active:bg-brand-100/80
                  ${index === highlightedIndex ? 'bg-slate-100' : ''}
                  ${String(opt.value) === String(value)
                    ? 'bg-brand-50 text-brand-900 font-semibold'
                    : 'text-slate-800 hover:bg-brand-50/80 hover:text-brand-900'}`}
              >
                {String(opt.value) === String(value) && (
                  <span className={`material-symbols-outlined text-brand-600 flex-shrink-0 ${dense ? 'text-[11px]' : 'text-[14px]'}`}>check</span>
                )}
                <span className={String(opt.value) === String(value) ? '' : (dense ? 'ml-[15px]' : 'ml-[22px]')}>{opt.label}</span>
              </button>
              </li>
            ))
          )}
        </ul>
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
          role="combobox"
          aria-expanded={false}
          aria-haspopup="listbox"
          aria-label={value ? `${placeholder}: ${selectedLabel}` : placeholder}
          className={`form-input w-full text-left flex items-center justify-between gap-2
            ${dense ? 'py-1 px-2 text-xs' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${!value ? 'text-slate-500' : 'text-slate-900'}`}
        >
          <span className={`truncate ${dense ? 'text-xs' : 'text-sm'}`}>{value ? selectedLabel : placeholder}</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClear(e); } }}
                className={`material-symbols-outlined text-slate-400 hover:text-rose-500 transition-colors ${dense ? 'text-[13px]' : 'text-[16px]'}`}
              >
                close
              </span>
            )}
            <span className={`material-symbols-outlined text-slate-500 ${dense ? 'text-[13px]' : 'text-[16px]'}`}>expand_more</span>
          </div>
        </button>
      ) : (
        <div className={`form-input flex items-center gap-2 p-0 overflow-hidden ${dense ? 'py-0' : ''}`}>
          <span className={`material-symbols-outlined text-slate-500 ml-3 flex-shrink-0 ${dense ? 'text-[13px]' : 'text-[16px]'}`}>search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type to search..."
            autoComplete="off"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-label={placeholder}
            aria-activedescendant={filtered[highlightedIndex] ? optionId(highlightedIndex) : undefined}
            className={`flex-1 pr-3 bg-transparent outline-none text-slate-900 placeholder-slate-400 ${dense ? 'py-1 text-xs' : 'py-2 text-sm'}`}
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
