import { useEffect, useRef, useState } from 'react';

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  swatch?: string;
  onChange: (value: number) => void;
  /** Nhấp đúp vào slider để reset riêng thông số này. */
  onDoubleClick?: () => void;
}

function formatValue(value: number, step: number) {
  if (step >= 1) return Math.round(value).toString();
  return value.toFixed(2);
}

export default function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  swatch,
  onChange,
  onDoubleClick,
}: ParamSliderProps) {
  const isDefault = Math.abs(value - 0) < (step >= 1 ? 0.5 : 0.005);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const n = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(n)) {
      onChange(Math.min(max, Math.max(min, n)));
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 select-none">
      {swatch && (
        <span
          className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-white/20"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span
        className={`w-[92px] flex-shrink-0 text-[13px] font-medium ${
          isDefault ? 'text-zinc-400' : 'text-zinc-200'
        }`}
      >
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={onDoubleClick}
        className="param-range min-w-0 flex-1"
        aria-label={label}
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-[52px] rounded-md border border-amber-400/60 bg-zinc-900 px-1 py-0.5 text-right text-[12px] font-mono tabular-nums text-amber-300 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(formatValue(value, step));
            setEditing(true);
          }}
          className={`w-[52px] flex-shrink-0 rounded-md px-1 py-0.5 text-right text-[12px] font-mono tabular-nums transition-colors ${
            isDefault
              ? 'text-zinc-600 hover:bg-white/5 hover:text-zinc-400'
              : 'text-amber-400 hover:bg-white/5'
          }`}
          aria-label={`Giá trị ${label}`}
        >
          {formatValue(value, step)}
        </button>
      )}
    </div>
  );
}
