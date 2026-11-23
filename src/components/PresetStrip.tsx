import type { EditParams, SplitTone } from '@/rules/params';
import { paramsEqual } from '@/rules/params';
import type { Preset } from '@/rules/presets';

interface PresetStripProps {
  presets: Preset[];
  activePresetId: string | null;
  params: EditParams;
  onSelect: (params: EditParams, splitTone: SplitTone | null, presetId: string | null) => void;
}

export default function PresetStrip({
  presets,
  activePresetId,
  params,
  onSelect,
}: PresetStripProps) {
  const activePreset = presets.find((p) => p.id === activePresetId);
  const isModified = !paramsEqual(params, activePreset?.params ?? params);

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
      role="listbox"
      aria-label="Chọn preset màu"
    >
      {presets.map((preset) => {
        const active = preset.id === activePresetId;
        return (
          <button
            key={preset.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(preset.params, preset.splitTone ?? null, preset.id)}
            className={`flex-shrink-0 rounded-xl border px-4 py-2 text-[13px] transition-all active:scale-[0.97] ${
              active
                ? 'border-amber-500 bg-amber-500/15 font-semibold text-amber-900 shadow-xs'
                : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 shadow-xs'
            }`}
          >
            {preset.name}
            {active && isModified && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />
            )}
          </button>
        );
      })}
    </div>
  );
}
