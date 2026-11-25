import { Download, Eye } from 'lucide-react';

interface ControlsPanelProps {
  intensity: number;
  onIntensityChange: (v: number) => void;
  onExport: () => void;
  onHoldOriginal: (pressed: boolean) => void;
  exporting: boolean;
  showOriginal: boolean;
  intensityDisabled?: boolean;
}

export default function ControlsPanel({
  intensity,
  onIntensityChange,
  onExport,
  onHoldOriginal,
  exporting,
  showOriginal,
  intensityDisabled = false,
}: ControlsPanelProps) {
  return (
    <div className="space-y-4 px-4 pb-5">
      <div className={intensityDisabled ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-zinc-700">Cường độ</span>
            {intensityDisabled && (
              <span className="text-[11px] font-medium text-zinc-400 italic">
                (chế độ Gốc)
              </span>
            )}
          </div>
          <span className="text-[12px] font-mono font-bold tabular-nums text-amber-600">
            {intensityDisabled ? '—' : `${Math.round(intensity * 100)}%`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          disabled={intensityDisabled}
          value={intensityDisabled ? 100 : Math.round(intensity * 100)}
          onChange={(e) => onIntensityChange(parseInt(e.target.value, 10) / 100)}
          className="param-range mt-1.5 w-full disabled:cursor-not-allowed"
          aria-label="Cường độ"
          title={
            intensityDisabled
              ? 'Chế độ gốc nguyên bản không cần áp dụng cường độ'
              : 'Điều chỉnh cường độ preset'
          }
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onHoldOriginal(true);
          }}
          onPointerUp={() => onHoldOriginal(false)}
          onPointerCancel={() => onHoldOriginal(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex h-12 flex-1 touch-none select-none items-center justify-center gap-2 rounded-xl border text-[14px] font-medium transition-colors shadow-xs ${
            showOriginal
              ? 'border-amber-500 bg-amber-500/15 font-semibold text-amber-900'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100'
          }`}
        >
          <Eye size={17} />
          {showOriginal ? 'Đang xem gốc' : 'Giữ để xem gốc'}
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 text-[14px] font-bold text-zinc-950 transition-all hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 shadow-xs"
        >
          <Download size={17} />
          {exporting ? 'Đang xuất...' : 'Xuất ảnh'}
        </button>
      </div>
    </div>
  );
}
