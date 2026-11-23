import { useCallback, useEffect, useRef, useState } from 'react';
import CanvasStage from '@/components/CanvasStage';
import ControlsPanel from '@/components/ControlsPanel';
import AdjustPanel from '@/components/AdjustPanel';
import PresetStrip from '@/components/PresetStrip';
import UploadZone from '@/components/UploadZone';
import {
  ImageEngine,
  downscaleCanvas,
  exportImage,
  loadImage,
} from '@/lib/imageEngine';
import {
  DEFAULT_PARAMS,
  clampParams,
  computeEffectiveParams,
  computeEffectiveSplitTone,
  paramsEqual,
  type EditParams,
  type HslChannelKey,
  type SplitTone,
} from '@/rules/params';
import { PRESETS, applyPresetGuards } from '@/rules/presets';

const PREVIEW_MAX_SIDE = 2048;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const fullImageRef = useRef<HTMLImageElement | null>(null);

  const [ready, setReady] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  // panel giữ giá trị preset gốc (không scale theo Cường độ)
  const [panel, setPanel] = useState<EditParams>(() => clampParams(DEFAULT_PARAMS));
  const [splitTone, setSplitTone] = useState<SplitTone | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>('original');
  const [intensity, setIntensity] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);

  const activePreset = PRESETS.find((p) => p.id === activePresetId);

  const render = useCallback(
    (p: EditParams, inten: number, tone: SplitTone | null, original: boolean) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (original) {
        engine.render(clampParams(DEFAULT_PARAMS), 0, null);
      } else {
        // Thông số hiệu lực = mặc định + (giá trị panel − mặc định) × Cường độ/100
        const effective = computeEffectiveParams(p, inten);
        const effectiveTone = computeEffectiveSplitTone(tone, inten);
        engine.render(effective, 1, effectiveTone);
      }
    },
    [],
  );

  useEffect(() => {
    if (ready) render(panel, intensity, splitTone, showOriginal);
  }, [ready, panel, intensity, splitTone, showOriginal, render]);

  useEffect(() => {
    if (!previewSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = previewSrc.width;
    canvas.height = previewSrc.height;
    engineRef.current?.dispose();
    try {
      engineRef.current = new ImageEngine(canvas, previewSrc);
      render(panel, intensity, splitTone, showOriginal);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Không khởi tạo được bộ xử lý ảnh trên thiết bị này',
      );
      setReady(false);
      setPreviewSrc(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewSrc]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    try {
      const img = await loadImage(file);
      fullImageRef.current = img;
      setPreviewSrc(downscaleCanvas(img, PREVIEW_MAX_SIDE));
      setPanel(clampParams(DEFAULT_PARAMS));
      setSplitTone(null);
      setActivePresetId('original');
      setIntensity(1);
      setReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể mở ảnh này');
      setReady(false);
    }
  }, []);

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const handlePresetSelect = useCallback(
    (presetParams: EditParams, presetSplitTone: SplitTone | null, presetId: string | null) => {
      const guarded = presetId
        ? applyPresetGuards(presetParams, presetId)
        : clampParams(presetParams);
      setPanel(guarded);
      setSplitTone(presetSplitTone);
      setActivePresetId(presetId);
    },
    [],
  );

  const handleParamChange = useCallback(
    (key: keyof EditParams, value: number) => {
      setPanel((prev) => clampParams({ ...prev, [key]: value }));
    },
    [],
  );

  const handleHslChange = useCallback(
    (
      channel: HslChannelKey,
      field: 'hue' | 'saturation' | 'luminance',
      value: number,
    ) => {
      setPanel((prev) => {
        const next = clampParams(prev);
        next.hsl[channel][field] = value;
        return clampParams(next);
      });
    },
    [],
  );

  const handleResetAll = useCallback(() => {
    const base = activePreset
      ? (activePreset.id ? applyPresetGuards(activePreset.params, activePreset.id) : clampParams(activePreset.params))
      : clampParams(DEFAULT_PARAMS);
    setPanel(base);
  }, [activePreset]);

  const handleExport = useCallback(async () => {
    const img = fullImageRef.current;
    if (!img || exporting) return;
    setExporting(true);
    try {
      const effective = computeEffectiveParams(panel, intensity);
      const effectiveTone = computeEffectiveSplitTone(splitTone, intensity);
      await exportImage(img, effective, 1, effectiveTone);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không xuất được ảnh');
    } finally {
      setExporting(false);
    }
  }, [panel, intensity, splitTone, exporting]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight">Studio Màu</h1>
          <p className="text-[12px] text-zinc-500">Chỉnh màu ảnh ngay trên máy của bạn</p>
        </div>
        {ready && (
          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-500">
            {fullImageRef.current?.naturalWidth}×{fullImageRef.current?.naturalHeight}
          </span>
        )}
      </header>

      {!ready ? (
        <UploadZone onFile={handleFile} error={error} />
      ) : (
        <>
          <CanvasStage canvasRef={canvasRef} showOriginal={showOriginal} />
          <div className="shrink-0 space-y-3 border-t border-white/[0.06] bg-zinc-950/95 pt-3">
            <div className="px-4">
              <PresetStrip
                presets={PRESETS}
                activePresetId={activePresetId}
                params={panel}
                onSelect={handlePresetSelect}
              />
            </div>
            <AdjustPanel
              params={panel}
              onParamChange={handleParamChange}
              onHslChange={handleHslChange}
              onResetAll={handleResetAll}
              resetDisabled={
                activePreset ? paramsEqual(panel, activePreset.params) : false
              }
            />
            <ControlsPanel
              intensity={intensity}
              onIntensityChange={setIntensity}
              onExport={handleExport}
              onHoldOriginal={setShowOriginal}
              exporting={exporting}
              showOriginal={showOriginal}
            />
          </div>
        </>
      )}

      {ready && error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-red-950/90 px-4 py-2 text-[13px] text-red-300 backdrop-blur">
          {error}
        </div>
      )}
    </div>
  );
}
