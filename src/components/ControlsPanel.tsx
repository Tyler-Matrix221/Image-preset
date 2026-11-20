import { Download, Eye } from 'lucide-react';

interface ControlsPanelProps {
  intensity: number;
  onIntensityChange: (v: number) => void;
  onExport: () => void;
  onHoldOriginal: (pressed: boolean) => void;
  exporting: boolean;
  showOriginal: boolean;
}

export default function ControlsPanel({
  intensity,
  onIntensityChange,
  onExport,
  onHoldOriginal,
  exporting,
  showOriginal,
}: ControlsPanelProps) {
  return (
    <div className="space-y-4 px-4 pb-5">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-zinc-300">Cường độ</span>
          <span className="text-[12px] font-mono tabular-nums text-amber-400">
            {Math.round(intensity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(intensity * 100)}
          onChange={(e) => onIntensityChange(parseInt(e.target.value, 10) / 100)}
          className="param-range mt-1.5 w-full"
          aria-label="Cường độ"
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
          className={`flex h-12 flex-1 touch-none select-none items-center justify-center gap-2 rounded-xl border text-[14px] font-medium transition-colors ${
            showOriginal
              ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
              : 'border-white/[0.08] bg-zinc-900/60 text-zinc-300 active:bg-white/[0.06]'
          }`}
        >
          <Eye size={17} />
          {showOriginal ? 'Đang xem gốc' : 'Giữ để xem gốc'}
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 text-[14px] font-semibold text-zinc-950 transition-transform active:scale-[0.97] disabled:opacity-50"
        >
          <Download size={17} />
          {exporting ? 'Đang xuất...' : 'Xuất ảnh'}
        </button>
      </div>
    </div>
  );
}
