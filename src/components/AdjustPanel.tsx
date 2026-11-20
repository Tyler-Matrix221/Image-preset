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
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/60 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 active:bg-white/[0.03]"
      >
        <span className="flex items-center gap-2.5 text-[15px] font-medium text-zinc-100">
          <SlidersHorizontal size={17} className="text-amber-400" />
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
            className="rounded-full border border-white/10 px-3 py-1 text-[12px] text-zinc-300 transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
          >
            Đặt lại tất cả
          </button>
          {open ? (
            <ChevronUp size={18} className="text-zinc-400" />
          ) : (
            <ChevronDown size={18} className="text-zinc-400" />
          )}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-5 border-t border-white/[0.06] px-4 pb-5 pt-4">
            {PARAM_GROUPS.map((group) => (
              <div key={group} className="space-y-3">
                <p className="text-[12px] font-medium uppercase tracking-wide text-zinc-500">
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
