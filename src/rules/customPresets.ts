import { clampParams, type EditParams, type SplitTone } from '@/rules/params';
import type { Preset } from '@/rules/presets';

const CUSTOM_PRESETS_KEY = 'studio_mau_custom_presets';

interface StoredPreset {
  id: string;
  name: string;
  params: EditParams;
  splitTone?: SplitTone | null;
}

export function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is StoredPreset => Boolean(item?.id && item?.name && item?.params))
      .map((item) => ({
        id: String(item.id),
        name: String(item.name).slice(0, 40),
        params: clampParams(item.params),
        splitTone: item.splitTone ?? undefined,
      }));
  } catch {
    return [];
  }
}

export function saveCustomPresets(presets: Preset[], builtInIds: Set<string>): void {
  try {
    const toStore: StoredPreset[] = presets
      .filter((p) => !builtInIds.has(p.id) && !p.lut)
      .map((p) => ({
        id: p.id,
        name: p.name,
        params: p.params,
        splitTone: p.splitTone ?? null,
      }));
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(toStore));
  } catch {
    // localStorage có thể đầy hoặc bị tắt ở chế độ riêng tư
  }
}
