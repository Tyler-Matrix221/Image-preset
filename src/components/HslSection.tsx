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
    <div className="space-y-1">
      <p className="pb-1 text-[12px] font-medium uppercase tracking-wide text-zinc-500">
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
            className="overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900/40"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => setOpenKey(open ? null : ch.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenKey(open ? null : ch.key); } }}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-3 py-2.5 cursor-pointer active:bg-white/[0.03]"
            >
              <span
                className="h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-white/20"
                style={{ backgroundColor: ch.swatch }}
              />
              <span className={`flex-1 text-left text-[13px] ${active ? 'font-medium text-amber-300' : 'text-zinc-300'}`}>
                {ch.label}
              </span>
              {active && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChannelReset(ch.key);
                  }}
                  className="rounded-full px-2 py-0.5 text-[11px] text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                >
                  Đặt lại
                </button>
              )}
              <ChevronDown
                size={16}
                className={`flex-shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </div>
            {open && (
              <div className="space-y-3 border-t border-white/[0.06] px-3 pb-3 pt-3">
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
