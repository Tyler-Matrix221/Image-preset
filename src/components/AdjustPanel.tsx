import { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import {
  PARAM_GROUPS,
  PARAM_SCHEMAS,
  type EditParams,
  type HslChannelKey,
} from '@/rules/params';
import ParamSlider from './ParamSlider';
import HslSection from './HslSection';

interface AdjustPanelProps {
  params: EditParams;
  onParamChange: (key: keyof EditParams, value: number) => void;
  onHslChange: (
    channel: HslChannelKey,
    field: 'hue' | 'saturation' | 'luminance',
    value: number,
  ) => void;
  onResetAll: () => void;
  resetDisabled: boolean;
}

export default function AdjustPanel({
  params,
  onParamChange,
  onHslChange,
  onResetAll,
  resetDisabled,
}: AdjustPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 cursor-pointer active:bg-zinc-50"
      >
        <span className="flex items-center gap-2.5 text-[15px] font-semibold text-zinc-900">
          <SlidersHorizontal size={17} className="text-amber-500" />
          Tinh chỉnh thủ công
        </span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResetAll();
            }}
            disabled={resetDisabled}
            className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-[12px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30"
          >
            Đặt lại tất cả
          </button>
          {open ? (
            <ChevronUp size={18} className="text-zinc-500" />
          ) : (
            <ChevronDown size={18} className="text-zinc-500" />
          )}
        </span>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="max-h-[45vh] space-y-5 overflow-y-auto overscroll-contain border-t border-zinc-200 bg-zinc-50/50 px-4 pb-5 pt-4">
            {PARAM_GROUPS.filter((g) => g !== 'HSL').map((group) => (
              <div key={group} className="space-y-3">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">
                  {group}
                </p>
                {PARAM_SCHEMAS.filter((s) => s.group === group).map((s) => (
                  <ParamSlider
                    key={s.key}
                    label={s.label}
                    value={params[s.key]}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    onChange={(v) => onParamChange(s.key, v)}
                    onDoubleClick={() => onParamChange(s.key, s.def)}
                  />
                ))}
              </div>
            ))}

            <div>
              <HslSection
                hsl={params.hsl}
                onChannelChange={onHslChange}
                onChannelReset={(channel) => {
                  onHslChange(channel, 'hue', 0);
                  onHslChange(channel, 'saturation', 0);
                  onHslChange(channel, 'luminance', 0);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
