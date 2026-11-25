import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Palette, Redo2, Settings, Undo2 } from 'lucide-react';
import CanvasStage from '@/components/CanvasStage';
import ControlsPanel from '@/components/ControlsPanel';
import AdjustPanel from '@/components/AdjustPanel';
import PresetStrip from '@/components/PresetStrip';
import UploadZone from '@/components/UploadZone';
import SettingsModal from '@/components/SettingsModal';
import AiSuggestionPanel from '@/components/AiSuggestionPanel';
import ClonePresetModal from '@/components/ClonePresetModal';
import ExportModal from '@/components/ExportModal';
import ShootingCoachTab from '@/components/ShootingCoachTab';
import {
  ImageEngine,
  downscaleCanvas,
  exportImage,
  loadImage,
  type ExportOptions,
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
import { PRESETS, applyPresetGuards, type Preset } from '@/rules/presets';
import { loadCustomPresets, saveCustomPresets } from '@/rules/customPresets';
import { downloadXmpPreset } from '@/rules/xmpExport';
import type { CubeLutData } from '@/rules/cubeImport';
import {
  DemoLimitReachedError,
  fetchDemoQuota,
  getDemoQuota,
  getStoredApiKey,
  hasAiAccess,
  hasDemoProxy,
  matchColorsBetweenImages,
  requestAiColorSuggestion,
  type DemoQuota,
} from '@/lib/geminiApi';

const PREVIEW_MAX_SIDE = 2048;
const BUILTIN_PRESET_IDS = new Set(PRESETS.map((p) => p.id));

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ImageEngine | null>(null);
  const fullImageRef = useRef<HTMLImageElement | null>(null);

  const [ready, setReady] = useState(false);
  const [activeMode, setActiveMode] = useState<'color' | 'shoot'>('color');
  const [previewSrc, setPreviewSrc] = useState<HTMLCanvasElement | null>(null);
  const originalPreviewUrl = useMemo(
    () => (previewSrc ? previewSrc.toDataURL('image/jpeg', 0.9) : null),
    [previewSrc],
  );
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  // Danh sách preset (bao gồm mặc định + preset đã lưu trong localStorage)
  const [presets, setPresets] = useState<Preset[]>(() => [
    ...PRESETS,
    ...loadCustomPresets(),
  ]);
  // panel giữ giá trị preset gốc (không scale theo Cường độ)
  const [panel, setPanel] = useState<EditParams>(() => clampParams(DEFAULT_PARAMS));
  const [splitTone, setSplitTone] = useState<SplitTone | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>('original');
  const [intensity, setIntensity] = useState(1);
  const [showOriginal, setShowOriginal] = useState(false);

  // Lịch sử Undo / Redo cho panel
  const [history, setHistory] = useState<EditParams[]>(() => [clampParams(DEFAULT_PARAMS)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyTimerRef = useRef<number | null>(null);

  const pushHistory = useCallback((nextParams: EditParams, immediate = false) => {
    const commit = () => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const last = sliced[sliced.length - 1];
        if (last && paramsEqual(last, nextParams)) return prev;
        const updated = [...sliced, nextParams].slice(-30);
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    };

    if (historyTimerRef.current) {
      window.clearTimeout(historyTimerRef.current);
      historyTimerRef.current = null;
    }

    if (immediate) {
      commit();
    } else {
      historyTimerRef.current = window.setTimeout(commit, 350);
    }
  }, [historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const prevIdx = historyIndex - 1;
    setHistoryIndex(prevIdx);
    setPanel(history[prevIdx]);
  }, [canUndo, history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    setPanel(history[nextIdx]);
  }, [canRedo, history, historyIndex]);

  // Tự động lưu các preset cá nhân vào localStorage
  useEffect(() => {
    saveCustomPresets(presets, BUILTIN_PRESET_IDS);
  }, [presets]);

  // Cài đặt API key & Trạng thái gọi AI
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(() => Boolean(getStoredApiKey()));
  const [demoQuota, setDemoQuota] = useState<DemoQuota | null>(() => getDemoQuota());
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!hasApiKey && hasDemoProxy()) {
      fetchDemoQuota().then((q) => {
        if (q) setDemoQuota(q);
      });
    }
  }, [hasApiKey]);

  const activePreset = presets.find((p) => p.id === activePresetId);
  const isLutActive = Boolean(activePreset?.lut);

  // Thanh Cường độ chỉ bị disable khi ở chế độ Gốc nguyên bản (không áp dụng cho LUT)
  const isIntensityDisabled =
    !isLutActive &&
    paramsEqual(panel, DEFAULT_PARAMS) &&
    (!splitTone?.shadow || splitTone.shadow.saturation === 0);

  const render = useCallback(
    (
      p: EditParams,
      inten: number,
      tone: SplitTone | null,
      original: boolean,
      lut?: CubeLutData | null,
    ) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (original) {
        // Giữ xem gốc: render ảnh gốc không hiệu ứng
        engine.render(clampParams(DEFAULT_PARAMS), 0, null, null);
      } else if (lut) {
        // Áp 3D LUT: Cường độ 0 -> ảnh gốc, 100 -> áp toàn bộ LUT
        engine.render(clampParams(DEFAULT_PARAMS), inten, null, lut);
      } else {
        // Preset thông số thông thường
        const effective = computeEffectiveParams(p, inten);
        const effectiveTone = computeEffectiveSplitTone(tone, inten);
        engine.render(effective, 1, effectiveTone, null);
      }
    },
    [],
  );

  useEffect(() => {
    if (ready) render(panel, intensity, splitTone, showOriginal, activePreset?.lut);
  }, [ready, panel, intensity, splitTone, showOriginal, activePreset, render]);

  useEffect(() => {
    if (!previewSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = previewSrc.width;
    canvas.height = previewSrc.height;
    engineRef.current?.dispose();
    try {
      engineRef.current = new ImageEngine(canvas, previewSrc);
      render(panel, intensity, splitTone, showOriginal, activePreset?.lut);
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

  // Tự động ẩn thông báo lỗi sau 4.5 giây
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [error]);

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

  const handleImportPreset = useCallback((newPreset: Preset) => {
    setPresets((prev) => [...prev, newPreset]);
    setPanel(newPreset.params);
    setSplitTone(newPreset.splitTone ?? null);
    setActivePresetId(newPreset.id);
    setError(null);
  }, []);

  const handleAiGenerate = useCallback(
    async (stylePrompt: string) => {
      const img = fullImageRef.current;
      if (!img) return;

      const key = getStoredApiKey();
      if (!key && !hasAiAccess()) {
        setError('Vui lòng vào Cài đặt để nhập Gemini API key trước khi sử dụng.');
        setSettingsOpen(true);
        return;
      }

      setIsAiLoading(true);
      setError(null);

      try {
        const suggestedParams = await requestAiColorSuggestion({
          image: img,
          stylePrompt,
          apiKey: key,
        });
        setDemoQuota(getDemoQuota());

        const aiPreset: Preset = {
          id: `ai-${Date.now()}`,
          name: 'AI gợi ý',
          params: suggestedParams,
        };

        setPresets((prev) => {
          const existingIdx = prev.findIndex((p) => p.name === 'AI gợi ý');
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = aiPreset;
            return updated;
          }
          return [...prev, aiPreset];
        });

        // Áp thông số đề xuất vào panel và kích hoạt preset
        setPanel(aiPreset.params);
        setSplitTone(null);
        setActivePresetId(aiPreset.id);
        setIntensity(1);
      } catch (err) {
        setDemoQuota(getDemoQuota());
        if (err instanceof DemoLimitReachedError) {
          setLimitNotice(err.message);
          setSettingsOpen(true);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Đã xảy ra lỗi khi gọi AI gợi ý màu.',
        );
      } finally {
        setIsAiLoading(false);
      }
    },
    [],
  );

  const handleAiMatchColor = useCallback(
    async (refImg: HTMLImageElement) => {
      const img = fullImageRef.current;
      if (!img) return;

      const key = getStoredApiKey();
      if (!key && !hasAiAccess()) {
        setError('Vui lòng vào Cài đặt để nhập Gemini API key trước khi sử dụng.');
        setSettingsOpen(true);
        return;
      }

      setIsAiLoading(true);
      setError(null);

      try {
        const suggestedParams = await matchColorsBetweenImages({
          targetImage: img,
          referenceImage: refImg,
          apiKey: key,
        });
        setDemoQuota(getDemoQuota());

        const matchPreset: Preset = {
          id: `ai-match-${Date.now()}`,
          name: 'Khớp màu AI',
          params: suggestedParams,
        };

        setPresets((prev) => {
          const existingIdx = prev.findIndex((p) => p.name === 'Khớp màu AI');
          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = matchPreset;
            return updated;
          }
          return [...prev, matchPreset];
        });

        setPanel(matchPreset.params);
        setSplitTone(null);
        setActivePresetId(matchPreset.id);
        setIntensity(1);
      } catch (err) {
        setDemoQuota(getDemoQuota());
        if (err instanceof DemoLimitReachedError) {
          setLimitNotice(err.message);
          setSettingsOpen(true);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Đã xảy ra lỗi khi so sánh và khớp màu bằng AI.',
        );
      } finally {
        setIsAiLoading(false);
      }
    },
    [],
  );

  const handlePresetCreatedFromClone = useCallback((newPreset: Preset) => {
    setPresets((prev) => [...prev, newPreset]);
    setPanel(newPreset.params);
    setSplitTone(null);
    setActivePresetId(newPreset.id);
    setIntensity(1);
  }, []);

  const handleParamChange = useCallback(
    (key: keyof EditParams, value: number) => {
      if (key === 'hsl') return;
      setPanel((prev) => {
        const next = clampParams({ ...prev, [key]: value });
        pushHistory(next, false);
        return next;
      });
    },
    [pushHistory],
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
        const clamped = clampParams(next);
        pushHistory(clamped, false);
        return clamped;
      });
    },
    [pushHistory],
  );

  const handleResetAll = useCallback(() => {
    const base = activePreset
      ? (activePreset.id ? applyPresetGuards(activePreset.params, activePreset.id) : clampParams(activePreset.params))
      : clampParams(DEFAULT_PARAMS);
    setPanel(base);
    pushHistory(base, true);
  }, [activePreset, pushHistory]);

  const handleSavePreset = useCallback(() => {
    const customCount = presets.filter((p) => !BUILTIN_PRESET_IDS.has(p.id)).length + 1;
    const nameInput = window.prompt('Đặt tên cho Preset mới:', `Màu của tôi #${customCount}`);
    if (!nameInput || !nameInput.trim()) return;
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name: nameInput.trim().slice(0, 30),
      params: clampParams(panel),
      splitTone: splitTone ?? undefined,
    };
    setPresets((prev) => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
  }, [panel, presets, splitTone]);

  const handleDeletePreset = useCallback((id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
    if (activePresetId === id) {
      setActivePresetId('original');
      const base = clampParams(DEFAULT_PARAMS);
      setPanel(base);
      setSplitTone(null);
      pushHistory(base, true);
    }
  }, [activePresetId, pushHistory]);

  const handleConfirmExport = useCallback(
    async (options: ExportOptions) => {
      const img = fullImageRef.current;
      if (!img || exporting) return;
      setExporting(true);
      try {
        const lut = activePreset?.lut;
        if (lut) {
          await exportImage(img, clampParams(DEFAULT_PARAMS), intensity, null, lut, options);
        } else {
          const effective = computeEffectiveParams(panel, intensity);
          const effectiveTone = computeEffectiveSplitTone(splitTone, intensity);
          await exportImage(img, effective, 1, effectiveTone, null, options);
        }
        setExportModalOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không xuất được ảnh');
      } finally {
        setExporting(false);
      }
    },
    [panel, intensity, splitTone, exporting, activePreset],
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-100 text-zinc-900">
      <header className="flex flex-col gap-2 border-b border-zinc-200/80 bg-white/85 px-4 pb-2.5 pt-3.5 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-zinc-900">Studio Màu</h1>
            <p className="text-[11.5px] text-zinc-500">
              {activeMode === 'color'
                ? 'Chỉnh màu ảnh ngay trên máy của bạn'
                : 'Canh góc, thông số & tạo dáng trước khi chụp'}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {activeMode === 'color' && ready && (
              <>
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Hoàn tác"
                  aria-label="Hoàn tác"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  title="Làm lại"
                  aria-label="Làm lại"
                >
                  <Redo2 size={15} />
                </button>
                <span className="hidden sm:inline-block rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
                  {fullImageRef.current?.naturalWidth}×{fullImageRef.current?.naturalHeight}
                </span>
              </>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
              title="Cài đặt API Key"
              aria-label="Cài đặt"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Thanh chuyển nhanh giữa 2 chế độ: Canh chụp (Tiền kỳ) -> Chỉnh màu (Hậu kỳ) */}
        <div className="flex rounded-xl bg-zinc-200/70 p-0.5 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setActiveMode('shoot')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
              activeMode === 'shoot'
                ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Camera size={14} />
            <span>Canh chụp & Tạo dáng</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('color')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
              activeMode === 'color'
                ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Palette size={14} />
            <span>Chỉnh màu</span>
          </button>
        </div>
      </header>

      {activeMode === 'shoot' ? (
        <ShootingCoachTab
          hasApiKey={hasApiKey}
          demoQuota={demoQuota}
          onQuotaUpdated={setDemoQuota}
          onOpenSettings={(notice) => {
            setLimitNotice(notice || null);
            setSettingsOpen(true);
          }}
          onSendToColorTab={async (file) => {
            await handleFile(file);
            setActiveMode('color');
          }}
          onError={setError}
        />
      ) : !ready ? (
        <UploadZone onFile={handleFile} error={error} />
      ) : (
        <>
          <CanvasStage
            canvasRef={canvasRef}
            showOriginal={showOriginal}
            originalUrl={originalPreviewUrl}
          />
          <div className="relative z-10 max-h-[56dvh] shrink-0 space-y-3 overflow-y-auto overscroll-contain border-t border-zinc-200/80 bg-white/95 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
            <div className="px-4">
              <PresetStrip
                presets={presets}
                builtInIds={BUILTIN_PRESET_IDS}
                activePresetId={activePresetId}
                params={panel}
                onSelect={(p, tone, id) => {
                  handlePresetSelect(p, tone, id);
                  pushHistory(id ? applyPresetGuards(p, id) : clampParams(p), true);
                }}
                onImportPreset={handleImportPreset}
                onOpenCloneModal={() => setCloneModalOpen(true)}
                onSavePreset={handleSavePreset}
                onDeletePreset={handleDeletePreset}
                onError={setError}
              />
            </div>
            <div className="px-4">
              <AiSuggestionPanel
                onGenerate={handleAiGenerate}
                onMatchColor={handleAiMatchColor}
                isLoading={isAiLoading}
                hasApiKey={hasApiKey}
                demoQuota={demoQuota}
                onOpenSettings={() => {
                  setLimitNotice(null);
                  setSettingsOpen(true);
                }}
              />
            </div>
            <AdjustPanel
              params={panel}
              onParamChange={handleParamChange}
              onHslChange={handleHslChange}
              onResetAll={handleResetAll}
              onExportXmp={() =>
                downloadXmpPreset(panel, activePreset?.name || 'studio-mau-preset')
              }
              resetDisabled={
                isLutActive || (activePreset ? paramsEqual(panel, activePreset.params) : false)
              }
              isLutActive={isLutActive}
            />
            <ControlsPanel
              intensity={intensity}
              onIntensityChange={setIntensity}
              onExport={() => setExportModalOpen(true)}
              onHoldOriginal={setShowOriginal}
              exporting={exporting}
              showOriginal={showOriginal}
              intensityDisabled={isIntensityDisabled}
            />
          </div>
        </>
      )}

      {/* Modal Xuất ảnh */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        onConfirmExport={handleConfirmExport}
        exporting={exporting}
        originalSize={
          fullImageRef.current
            ? {
                width: fullImageRef.current.naturalWidth,
                height: fullImageRef.current.naturalHeight,
              }
            : null
        }
      />

      {/* Modal Cài đặt */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setLimitNotice(null);
        }}
        onSaved={(hasKey) => {
          setHasApiKey(hasKey);
          if (hasKey) setLimitNotice(null);
        }}
        limitNotice={limitNotice}
      />

      {/* Modal Hút màu từ ảnh mẫu bằng AI */}
      <ClonePresetModal
        isOpen={cloneModalOpen}
        onClose={() => setCloneModalOpen(false)}
        onPresetCreated={(preset) => {
          setDemoQuota(getDemoQuota());
          handlePresetCreatedFromClone(preset);
        }}
        onError={setError}
        hasApiKey={hasApiKey}
        onOpenSettings={() => {
          setLimitNotice(null);
          setSettingsOpen(true);
        }}
        onDemoLimitReached={(msg) => {
          setDemoQuota(getDemoQuota());
          setLimitNotice(msg);
          setSettingsOpen(true);
        }}
      />

      {(ready || activeMode === 'shoot') && error && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full border border-red-300 bg-red-100/90 px-4 py-2 text-[13px] font-medium text-red-700 shadow-lg backdrop-blur">
          {error}
        </div>
      )}
    </div>
  );
}
