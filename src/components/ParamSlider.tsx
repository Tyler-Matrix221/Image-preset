import { useEffect, useRef, useState } from 'react';

interface ParamSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  swatch?: string;
  onChange: (value: number) => void;
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
          className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-zinc-300 shadow-2xs"
          style={{ backgroundColor: swatch }}
        />
      )}
      <span
        className={`w-[92px] flex-shrink-0 text-[13px] font-medium ${
          isDefault ? 'text-zinc-500' : 'text-zinc-900 font-semibold'
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
          className="w-[52px] rounded-md border border-amber-500 bg-white px-1 py-0.5 text-right text-[12px] font-mono tabular-nums text-amber-700 outline-none shadow-xs"
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
              ? 'text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700'
              : 'text-amber-700 font-semibold hover:bg-amber-50'
          }`}
          aria-label={`Giá trị ${label}`}
        >
          {formatValue(value, step)}
        </button>
      )}
    </div>
  );
}
