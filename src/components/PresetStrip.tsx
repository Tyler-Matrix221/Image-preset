import { useRef } from 'react';
import { FolderUp, Sparkles } from 'lucide-react';
import type { EditParams, SplitTone } from '@/rules/params';
import { paramsEqual } from '@/rules/params';
import type { Preset } from '@/rules/presets';
import { parseXmpPreset } from '@/rules/xmpImport';
import { parseCubeLut } from '@/rules/cubeImport';

interface PresetStripProps {
  presets: Preset[];
  activePresetId: string | null;
  params: EditParams;
  onSelect: (params: EditParams, splitTone: SplitTone | null, presetId: string | null) => void;
  onImportPreset?: (preset: Preset) => void;
  onOpenCloneModal?: () => void;
  onError?: (msg: string) => void;
}

export default function PresetStrip({
  presets,
  activePresetId,
  params,
  onSelect,
  onImportPreset,
  onOpenCloneModal,
  onError,
}: PresetStripProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePreset = presets.find((p) => p.id === activePresetId);
  const isModified = !activePreset?.lut && !paramsEqual(params, activePreset?.params ?? params);

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lowerName = file.name.toLowerCase();

        // Phân biệt file .cube (LUT) và file .xmp
        const isCube =
          lowerName.endsWith('.cube') ||
          text.includes('LUT_3D_SIZE') ||
          text.includes('LUT_1D_SIZE');

        if (isCube) {
          const result = parseCubeLut(text, file.name);
          onImportPreset?.(result.preset);
        } else {
          const result = parseXmpPreset(text, file.name);
          onImportPreset?.(result.preset);
        }
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Không thể nhập file preset này');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
      onError?.('Lỗi khi đọc file preset từ thiết bị');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
      role="listbox"
      aria-label="Chọn hoặc nhập preset màu"
    >
      {/* Nút Nhập file preset (.xmp / .cube) */}
      <button
        type="button"
        onClick={handleOpenFileDialog}
        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-[12px] font-medium text-zinc-700 shadow-xs transition-all hover:border-amber-500 hover:bg-amber-50/50 hover:text-amber-800 active:scale-[0.97]"
        title="Nhập preset từ file Adobe Camera Raw (.xmp) hoặc 3D LUT (.cube)"
      >
        <FolderUp className="h-3.5 w-3.5 text-amber-600" />
        <span>File (.xmp/.cube)</span>
      </button>

      {/* Nút Hút màu từ ảnh mẫu bằng AI */}
      <button
        type="button"
        onClick={onOpenCloneModal}
        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-rose-300 bg-rose-50/40 px-3 py-2 text-[12px] font-semibold text-rose-800 shadow-xs transition-all hover:border-rose-500 hover:bg-rose-100/60 active:scale-[0.97]"
        title="Tải ảnh mẫu (TikTok, FB, Pinterest) để AI hút màu thành preset mới"
      >
        <Sparkles className="h-3.5 w-3.5 text-rose-600" />
        <span>Hút màu ảnh (AI)</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xmp,.cube,text/plain,text/xml,application/xml"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="h-5 w-[1px] flex-shrink-0 bg-zinc-200" aria-hidden="true" />

      {/* Danh sách các presets */}
      {presets.map((preset) => {
        const active = preset.id === activePresetId;
        const isAiPreset = preset.id.startsWith('clone-') || preset.id.startsWith('ai-') || preset.name.includes('AI');

        return (
          <button
            key={preset.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(preset.params, preset.splitTone ?? null, preset.id)}
            className={`flex-shrink-0 inline-flex items-center rounded-xl border px-3.5 py-2 text-[13px] transition-all active:scale-[0.97] ${
              active
                ? 'border-amber-500 bg-amber-500/15 font-semibold text-amber-900 shadow-xs'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 shadow-xs'
            }`}
          >
            <span>{preset.name}</span>
            {preset.lut && (
              <span className="ml-1.5 rounded-md border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-900">
                LUT
              </span>
            )}
            {isAiPreset && !preset.lut && (
              <span className="ml-1.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                AI
              </span>
            )}
            {active && isModified && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
            )}
          </button>
        );
      })}
    </div>
  );
}
