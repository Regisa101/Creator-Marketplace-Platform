import { useEffect, useRef, useState } from 'react';

/** Text input with an auto-suggest list. Any text can be kept if nothing matches. */
export function LocationInput({
  value,
  onChange,
  options,
  placeholder = 'Start typing your city',
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  const q = value.trim().toLowerCase();
  const suggestions = options.filter((x) => x.toLowerCase().includes(q)).slice(0, 40);

  return (
    <div className="lc-wrap" ref={ref}>
      <style>{`
        .lc-wrap{position:relative}
        .lc-menu{position:absolute;z-index:60;left:0;right:0;top:calc(100% + 4px);max-height:200px;overflow-y:auto;padding:5px;background:#fff;border:1px solid #e6e6ea;border-radius:8px;box-shadow:0 14px 30px rgba(0,0,0,.08)}
        .lc-item{display:block;width:100%;text-align:left;background:#fff;border:0;border-radius:6px;padding:8px 10px;font:400 12.5px Poppins,sans-serif;color:#111;cursor:pointer}
        .lc-item:hover,.lc-item.is-selected{background:#f4f4f5}
        .lc-empty{padding:9px 10px;font:400 11.5px Poppins,sans-serif;color:#777}
      `}</style>

      <input
        className="bp-inline-input"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
      />

      {open && (
        <div className="lc-menu">
          {suggestions.length > 0 ? (
            suggestions.map((x) => (
              <button
                type="button"
                key={x}
                className={`lc-item${x === value ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(x);
                  setOpen(false);
                }}
              >
                {x}
              </button>
            ))
          ) : (
            <div className="lc-empty">No match. You can keep your own location.</div>
          )}
        </div>
      )}
    </div>
  );
}