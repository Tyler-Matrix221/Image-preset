import type { EditParams } from '@/rules/params';
import { paramsEqual } from '@/rules/params';
import type { Preset } from '@/rules/presets';

interface PresetStripProps {
  presets: Preset[];
  activePresetId: string | null;
  params: EditParams;
  onSelect: (params: EditParams, splitTone: Preset['splitTone'], presetId: string | null) => void;
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
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-300'
                : 'border-white/[0.08] bg-zinc-900/60 text-zinc-300 hover:border-white/[0.16]'
            }`}
          >
            {preset.name}
            {active && isModified && (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
            )}
          </button>
        );
      })}
    </div>
  );
}
