import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  HSL_CHANNELS,
  HSL_FIELD_SCHEMAS,
  type HslChannel,
  type HslChannelKey,
} from '@/rules/params';
import ParamSlider from './ParamSlider';

interface HslSectionProps {
  hsl: Record<HslChannelKey, HslChannel>;
  onChannelChange: (channel: HslChannelKey, field: 'hue' | 'saturation' | 'luminance', value: number) => void;
  onChannelReset: (channel: HslChannelKey) => void;
}

export default function HslSection({
  hsl,
  onChannelChange,
  onChannelReset,
}: HslSectionProps) {
  const [openKey, setOpenKey] = useState<HslChannelKey | null>(null);

  return (
    <div className="space-y-1.5">
      <p className="pb-1 text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
        HSL — từng kênh màu
      </p>
      {HSL_CHANNELS.map((ch) => {
        const channel = hsl[ch.key];
        const active =
          channel.hue !== 0 || channel.saturation !== 0 || channel.luminance !== 0;
        const open = openKey === ch.key;
        return (
          <div
            key={ch.key}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOpenKey(open ? null : ch.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(open ? null : ch.key); } }}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-3 py-2.5 cursor-pointer active:bg-zinc-50"
            >
              <span
                className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-zinc-300 shadow-2xs"
                style={{ backgroundColor: ch.swatch }}
              />
              <span className={`flex-1 text-left text-[13px] ${active ? 'font-semibold text-amber-800' : 'text-zinc-700'}`}>
                {ch.label}
              </span>
              {active && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChannelReset(ch.key);
                  }}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200"
                >
                  Đặt lại
                </button>
              )}
              <ChevronDown
                size={16}
                className={`flex-shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </div>
            {open && (
              <div className="space-y-3 border-t border-zinc-200 bg-zinc-50/60 px-3 pb-3 pt-3">
                {HSL_FIELD_SCHEMAS.map((f) => (
                  <ParamSlider
                    key={f.key}
                    label={f.label}
                    value={channel[f.key]}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    onChange={(v) => onChannelChange(ch.key, f.key, v)}
                    onDoubleClick={() => onChannelChange(ch.key, f.key, f.def)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
