import { useState, useEffect, useRef } from 'react';

export default function ListSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  debounceMs = 300,
}) {
  const [localValue, setLocalValue] = useState(value);
  const timer = useRef(null);

  // Sync when parent resets value externally (e.g. clear or page reset)
  useEffect(() => { setLocalValue(value); }, [value]);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (e) => {
    const v = e.target.value;
    setLocalValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange({ target: { value: v } }), debounceMs);
  };

  return (
    <div className={`relative ${className}`}>
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
        search
      </span>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="form-input text-xs pl-9 min-w-[240px]"
      />
    </div>
  );
}
