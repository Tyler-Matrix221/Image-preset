// Schema trung tâm cho mọi thông số chỉnh sửa.
// Mọi giá trị đi vào app (preset, slider, rule sửa tay) đều phải qua clampParams().

export type HslChannelKey =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'aqua'
  | 'blue'
  | 'purple'
  | 'magenta';

export interface HslChannel {
  hue: number; // -100..100
  saturation: number; // -100..100
  luminance: number; // -100..100
}

export interface EditParams {
  // Ánh sáng
  exposure: number; // -2..2
  contrast: number; // -100..100
  highlights: number; // -100..100
  shadows: number; // -100..100
  whites: number; // -100..100
  blacks: number; // -100..100
  // Màu sắc
  temperature: number; // độ K lệch, -1000..1000
  tint: number; // -100..100
  saturation: number; // -100..100
  vibrance: number; // -100..100
  // HSL 8 kênh
  hsl: Record<HslChannelKey, HslChannel>;
}

export type ScalarKey = Exclude<keyof EditParams, 'hsl'>;
export type HslFieldKey = keyof HslChannel;

export type ParamGroup = 'Ánh sáng' | 'Màu sắc' | 'HSL';

export interface ParamSchema {
  key: ScalarKey;
  label: string;
  min: number;
  max: number;
  def: number;
  step: number;
  group: 'Ánh sáng' | 'Màu sắc';
}

export const PARAM_SCHEMAS: ParamSchema[] = [
  // Ánh sáng
  { key: 'exposure', label: 'Phơi sáng', min: -2, max: 2, def: 0, step: 0.05, group: 'Ánh sáng' },
  { key: 'contrast', label: 'Tương phản', min: -100, max: 100, def: 0, step: 1, group: 'Ánh sáng' },
  { key: 'highlights', label: 'Vùng sáng', min: -100, max: 100, def: 0, step: 1, group: 'Ánh sáng' },
  { key: 'shadows', label: 'Vùng tối', min: -100, max: 100, def: 0, step: 1, group: 'Ánh sáng' },
  { key: 'whites', label: 'Điểm trắng', min: -100, max: 100, def: 0, step: 1, group: 'Ánh sáng' },
  { key: 'blacks', label: 'Điểm đen', min: -100, max: 100, def: 0, step: 1, group: 'Ánh sáng' },
  // Màu sắc
  { key: 'temperature', label: 'Nhiệt độ (K lệch)', min: -1000, max: 1000, def: 0, step: 5, group: 'Màu sắc' },
  { key: 'tint', label: 'Sắc tố', min: -100, max: 100, def: 0, step: 1, group: 'Màu sắc' },
  { key: 'saturation', label: 'Độ bão hòa', min: -100, max: 100, def: 0, step: 1, group: 'Màu sắc' },
  { key: 'vibrance', label: 'Độ rực rỡ', min: -100, max: 100, def: 0, step: 1, group: 'Màu sắc' },
];

export const PARAM_GROUPS: ParamGroup[] = ['Ánh sáng', 'Màu sắc', 'HSL'];

export interface HslChannelSchema {
  key: HslChannelKey;
  label: string;
  swatch: string;
}

export const HSL_CHANNELS: HslChannelSchema[] = [
  { key: 'red', label: 'Đỏ', swatch: '#ef4444' },
  { key: 'orange', label: 'Cam', swatch: '#f97316' },
  { key: 'yellow', label: 'Vàng', swatch: '#eab308' },
  { key: 'green', label: 'Xanh lá', swatch: '#22c55e' },
  { key: 'aqua', label: 'Xanh ngọc', swatch: '#06b6d4' },
  { key: 'blue', label: 'Xanh dương', swatch: '#3b82f6' },
  { key: 'purple', label: 'Tím', swatch: '#a855f7' },
  { key: 'magenta', label: 'Hồng cánh sen', swatch: '#ec4899' },
];

export interface HslFieldSchema {
  key: HslFieldKey;
  label: string;
  min: number;
  max: number;
  def: number;
  step: number;
}

export const HSL_FIELD_SCHEMAS: HslFieldSchema[] = [
  { key: 'hue', label: 'Sắc độ', min: -100, max: 100, def: 0, step: 1 },
  { key: 'saturation', label: 'Bão hòa', min: -100, max: 100, def: 0, step: 1 },
  { key: 'luminance', label: 'Độ sáng', min: -100, max: 100, def: 0, step: 1 },
];

export const HSL_RANGE = { min: -100, max: 100, def: 0 };

export const DEFAULT_HSL: Record<HslChannelKey, HslChannel> = Object.fromEntries(
  HSL_CHANNELS.map((c) => [c.key, { hue: 0, saturation: 0, luminance: 0 }]),
) as Record<HslChannelKey, HslChannel>;

export const DEFAULT_PARAMS: EditParams = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  hsl: {
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    aqua: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 },
  },
};

function clampNum(value: unknown, min: number, max: number, def: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : def;
  return Math.min(max, Math.max(min, n));
}

/** Kẹp mọi giá trị của EditParams về đúng khoảng min–max theo schema.
 *  Giá trị thiếu, NaN hoặc lố (ví dụ 999) được thay bằng mặc định / biên gần nhất. */
export function clampParams(params: EditParams): EditParams {
  const safe = params && typeof params === 'object' ? params : DEFAULT_PARAMS;
  const out = { ...DEFAULT_PARAMS, hsl: { ...DEFAULT_PARAMS.hsl } };
  for (const s of PARAM_SCHEMAS) {
    out[s.key] = clampNum(safe[s.key], s.min, s.max, s.def);
  }
  for (const ch of HSL_CHANNELS) {
    const raw = safe.hsl?.[ch.key];
    out.hsl[ch.key] = {
      hue: clampNum(raw?.hue, HSL_RANGE.min, HSL_RANGE.max, HSL_RANGE.def),
      saturation: clampNum(raw?.saturation, HSL_RANGE.min, HSL_RANGE.max, HSL_RANGE.def),
      luminance: clampNum(raw?.luminance, HSL_RANGE.min, HSL_RANGE.max, HSL_RANGE.def),
    };
  }
  return out;
}

/** Thông số hiệu lực áp lên ảnh:
 *  hiệu lực = mặc định + (giá trị panel − mặc định) × Cường độ / 100 */
export function computeEffectiveParams(
  panel: EditParams,
  intensity: number,
): EditParams {
  const k = Math.min(1, Math.max(0, intensity));
  const p = clampParams(panel);
  const base = clampParams(DEFAULT_PARAMS);
  const mix = (key: ScalarKey) => base[key] + (p[key] - base[key]) * k;
  const out = { ...DEFAULT_PARAMS, hsl: { ...DEFAULT_PARAMS.hsl } };
  for (const s of PARAM_SCHEMAS) {
    out[s.key] = mix(s.key);
  }
  for (const ch of HSL_CHANNELS) {
    out.hsl[ch.key] = {
      hue: base.hsl[ch.key].hue + (p.hsl[ch.key].hue - base.hsl[ch.key].hue) * k,
      saturation:
        base.hsl[ch.key].saturation +
        (p.hsl[ch.key].saturation - base.hsl[ch.key].saturation) * k,
      luminance:
        base.hsl[ch.key].luminance +
        (p.hsl[ch.key].luminance - base.hsl[ch.key].luminance) * k,
    };
  }
  return out;
}

export function paramsEqual(a: EditParams, b: EditParams): boolean {
  for (const s of PARAM_SCHEMAS) {
    if (a[s.key] !== b[s.key]) return false;
  }
  for (const ch of HSL_CHANNELS) {
    const ca = a.hsl[ch.key];
    const cb = b.hsl[ch.key];
    if (
      ca.hue !== cb.hue ||
      ca.saturation !== cb.saturation ||
      ca.luminance !== cb.luminance
    ) {
      return false;
    }
  }
  return true;
}

/** Split tone: nhuộm màu vùng tối theo hue (0–360) và cường độ (0–100). */
export interface SplitTone {
  shadow: { hue: number; saturation: number } | null;
}

export function computeEffectiveSplitTone(
  tone: SplitTone | null | undefined,
  intensity: number,
): SplitTone | null {
  if (!tone?.shadow) return null;
  const k = Math.min(1, Math.max(0, intensity));
  return {
    shadow: {
      hue: tone.shadow.hue,
      saturation: tone.shadow.saturation * k,
    },
  };
}
