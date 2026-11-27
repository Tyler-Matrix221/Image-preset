import { Download, Eye } from 'lucide-react';

interface IntensityBarProps {
  intensity: number;
  onIntensityChange: (v: number) => void;
  intensityDisabled?: boolean;
}

export function IntensityBar({
  intensity,
  onIntensityChange,
  intensityDisabled = false,
}: IntensityBarProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 ${
        intensityDisabled ? 'opacity-40 transition-opacity' : 'transition-opacity'
      }`}
    >
      <span className="shrink-0 text-[12px] font-semibold text-zinc-700">
        Cường độ
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        disabled={intensityDisabled}
        value={intensityDisabled ? 100 : Math.round(intensity * 100)}
        onChange={(e) => onIntensityChange(parseInt(e.target.value, 10) / 100)}
        className="param-range flex-1 disabled:cursor-not-allowed"
        aria-label="Cường độ"
        title={
          intensityDisabled
            ? 'Chế độ gốc nguyên bản không cần áp dụng cường độ'
            : 'Điều chỉnh cường độ preset'
        }
      />
      <span className="w-10 shrink-0 text-right text-[12px] font-mono font-bold tabular-nums text-amber-600">
        {intensityDisabled ? '—' : `${Math.round(intensity * 100)}%`}
      </span>
    </div>
  );
}

interface BottomActionBarProps {
  onExport: () => void;
  onHoldOriginal: (pressed: boolean) => void;
  exporting: boolean;
  showOriginal: boolean;
}

export function BottomActionBar({
  onExport,
  onHoldOriginal,
  exporting,
  showOriginal,
}: BottomActionBarProps) {
  return (
    <div className="flex gap-2.5 border-t border-zinc-200/80 bg-white px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onHoldOriginal(true);
        }}
        onPointerUp={() => onHoldOriginal(false)}
        onPointerCancel={() => onHoldOriginal(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={`flex h-10 flex-1 touch-none select-none items-center justify-center gap-1.5 rounded-xl border text-[13px] font-medium transition-colors shadow-2xs ${
          showOriginal
            ? 'border-amber-500 bg-amber-500/15 font-semibold text-amber-900'
            : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100'
        }`}
      >
        <Eye size={16} />
        {showOriginal ? 'Đang xem gốc' : 'Giữ xem gốc'}
      </button>
      <button
        type="button"
        onClick={onExport}
        disabled={exporting}
        className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-400 text-[13px] font-bold text-zinc-950 transition-all hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 shadow-2xs"
      >
        <Download size={16} />
        {exporting ? 'Đang xuất...' : 'Xuất ảnh'}
      </button>
    </div>
  );
}

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
    <div className="space-y-1">
      <IntensityBar
        intensity={intensity}
        onIntensityChange={onIntensityChange}
        intensityDisabled={intensityDisabled}
      />
      <BottomActionBar
        onExport={onExport}
        onHoldOriginal={onHoldOriginal}
        exporting={exporting}
        showOriginal={showOriginal}
      />
    </div>
  );
}
