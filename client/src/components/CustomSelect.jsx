import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, style, className, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const clickOut = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const selectedOption = options.find(o => o.value === value) || null;

  return (
    <div ref={ref} style={{ position: 'relative', width: style?.width || '100%' }}>
      <div 
        className={`input ${className || ''}`}
        style={{ ...style, width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none', background: 'var(--bg-card)', color: 'var(--text-main)' }}
        onClick={() => setOpen(!open)}
      >
        <span style={{ color: selectedOption && selectedOption.value !== '' ? 'inherit' : 'var(--text-mist)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '10px' }}>
          {selectedOption ? selectedOption.label : (placeholder || 'Select...')}
        </span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.7rem', color: 'var(--text-mist)', flexShrink: 0 }}>▼</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)', zIndex: 100, maxHeight: '250px', overflowY: 'auto'
        }}>
          {options.map((opt, i) => (
            <div 
              key={i}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setOpen(false);
              }}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: '0.85rem',
                background: value === opt.value ? 'var(--bg-body)' : 'transparent',
                borderBottom: i < options.length - 1 ? '1px solid var(--border-color)' : 'none',
                color: 'var(--text-main)', transition: 'background 0.1s', fontWeight: value === opt.value ? 600 : 400
              }}
              onMouseEnter={(e) => { if (value !== opt.value) e.target.style.background = 'var(--bg-body)'; }}
              onMouseLeave={(e) => { if (value !== opt.value) e.target.style.background = 'transparent'; }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


