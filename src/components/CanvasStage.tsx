import { useRef, useState } from 'react';
import { Columns2, MoveHorizontal } from 'lucide-react';

interface CanvasStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  showOriginal: boolean;
  originalUrl?: string | null;
  onHoldOriginal?: (pressed: boolean) => void;
}

export default function CanvasStage({
  canvasRef,
  showOriginal,
  originalUrl,
  onHoldOriginal,
}: CanvasStageProps) {
  const [compareMode, setCompareMode] = useState(false);
  const [splitPos, setSplitPos] = useState(50);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updatePosition = (clientX: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplitPos(Math.min(96, Math.max(4, pct)));
  };

  return (
    <div className="relative flex min-h-[180px] w-full flex-1 items-center justify-center overflow-hidden bg-zinc-200/50 px-3 py-2">
      <div
        ref={wrapperRef}
        onPointerDown={(e) => {
          if (compareMode && !showOriginal) {
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            updatePosition(e.clientX);
            return;
          }
          if (!compareMode && onHoldOriginal) {
            e.currentTarget.setPointerCapture(e.pointerId);
            onHoldOriginal(true);
          }
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current || !compareMode || showOriginal) return;
          updatePosition(e.clientX);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
          if (!compareMode && onHoldOriginal) onHoldOriginal(false);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          if (!compareMode && onHoldOriginal) onHoldOriginal(false);
        }}
        onContextMenu={(e) => e.preventDefault()}
        className={`relative flex h-full w-full items-center justify-center overflow-hidden select-none touch-none ${
          compareMode && !showOriginal ? 'cursor-ew-resize' : 'cursor-pointer'
        }`}
        title={compareMode ? 'Kéo để so sánh Trước / Sau' : 'Chạm giữ vào ảnh để xem ảnh gốc'}
      >
        <canvas
          ref={canvasRef}
          className="block max-h-full max-w-full rounded-xl object-contain shadow-[0_6px_30px_rgba(0,0,0,0.12)] border border-zinc-300/60"
        />

        {showOriginal && (
          <span className="pointer-events-none absolute left-2.5 top-2.5 z-10 rounded-full bg-zinc-900/80 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-xs">
            Ảnh gốc
          </span>
        )}

        {compareMode && !showOriginal && originalUrl && (
          <>
            <img
              src={originalUrl}
              alt="Ảnh gốc"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full rounded-xl object-contain"
              style={{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.45)]"
              style={{ left: `${splitPos}%` }}
            >
              <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-800 shadow-md">
                <MoveHorizontal size={14} />
              </div>
            </div>
            <span className="pointer-events-none absolute left-2.5 bottom-2.5 rounded-full bg-zinc-900/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
              Gốc
            </span>
            <span className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-950 backdrop-blur-xs">
              Sau chỉnh
            </span>
          </>
        )}
      </div>

      {originalUrl && !showOriginal && (
        <button
          type="button"
          onClick={() => setCompareMode((m) => !m)}
          className={`absolute right-4 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-xs backdrop-blur-xs transition-all ${
            compareMode
              ? 'border-amber-500 bg-amber-400/95 text-zinc-950 font-semibold'
              : 'border-zinc-200/80 bg-white/85 text-zinc-700 hover:bg-white'
          }`}
          title="Kéo thanh chia đôi để so sánh Trước / Sau"
        >
          <Columns2 size={13} />
          <span>{compareMode ? 'Tắt so sánh' : 'So sánh'}</span>
        </button>
      )}

      {showOriginal && (
        <span className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-zinc-900/85 px-3 py-1 text-[12px] font-medium tracking-wide text-white shadow-md backdrop-blur">
          ẢNH GỐC
        </span>
      )}
    </div>
  );
}
