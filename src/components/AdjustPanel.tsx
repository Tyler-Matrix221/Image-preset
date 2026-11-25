import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Info, SlidersHorizontal } from 'lucide-react';
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
  onExportXmp?: () => void;
  resetDisabled: boolean;
  isLutActive?: boolean;
}

export default function AdjustPanel({
  params,
  onParamChange,
  onHslChange,
  onResetAll,
  onExportXmp,
  resetDisabled,
  isLutActive = false,
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
          <SlidersHorizontal size={17} className={isLutActive ? 'text-zinc-400' : 'text-amber-500'} />
          <span>Tinh chỉnh thủ công</span>
          {isLutActive && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              LUT không có thông số
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          {open && !isLutActive && onExportXmp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExportXmp();
              }}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[11.5px] font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              title="Xuất thông số hiện tại ra file .xmp (Lightroom)"
            >
              <Download size={12} />
              <span>.xmp</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResetAll();
            }}
            disabled={isLutActive || resetDisabled}
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
            {isLutActive ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-2xs">
                <Info size={20} className="text-amber-600" />
                <p className="text-[14px] font-semibold text-zinc-800">LUT không có thông số</p>
                <p className="text-[12px] text-zinc-500 max-w-xs">
                  LUT là bảng ánh xạ màu 3D cố định. Bạn có thể kéo thanh Cường độ để gia giảm hiệu ứng, hoặc chọn một preset khác để tiếp tục chỉnh tay.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
