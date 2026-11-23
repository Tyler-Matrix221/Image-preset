interface CanvasStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  showOriginal: boolean;
}

export default function CanvasStage({ canvasRef, showOriginal }: CanvasStageProps) {
  return (
    <div className="relative flex min-h-0 w-full flex-1 items-center justify-center bg-zinc-200/50 px-3 py-2">
      <canvas
        ref={canvasRef}
        className="max-h-full max-w-full rounded-xl object-contain shadow-[0_6px_30px_rgba(0,0,0,0.12)] border border-zinc-300/60"
      />
      {showOriginal && (
        <span className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-zinc-900/85 px-3 py-1 text-[12px] font-medium tracking-wide text-white shadow-md backdrop-blur">
          ẢNH GỐC
        </span>
      )}
    </div>
  );
}
