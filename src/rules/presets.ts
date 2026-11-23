import {
  clampParams,
  DEFAULT_PARAMS,
  type EditParams,
  type HslChannelKey,
  type SplitTone,
} from './params';

export interface Preset {
  id: string;
  name: string;
  params: EditParams;
  /** Split tone đi kèm preset (hiện chỉ dùng cho vùng tối của Tông lạnh). */
  splitTone?: SplitTone;
}

/** Guard cứng của preset Tông lạnh: bão hòa kênh Cam KHÔNG BAO GIỜ được dương
 *  (bảo vệ màu da). Clamp riêng, max = 0 — áp sau clampParams, mọi đường đi vào
 *  app (kể cả rule bị sửa tay thành giá trị dương) đều bị kẹp về tối đa 0. */
export const COOL_PRESET_ORANGE_SAT_MAX = 0;

export function applyPresetGuards(params: EditParams, presetId: string): EditParams {
  const clamped = clampParams(params);
  if (presetId === 'cool') {
    clamped.hsl.orange.saturation = Math.min(
      clamped.hsl.orange.saturation,
      COOL_PRESET_ORANGE_SAT_MAX,
    );
  }
  return clamped;
}

export const PRESETS: Preset[] = [
  {
    id: 'original',
    name: 'Gốc',
    params: clampParams(DEFAULT_PARAMS),
  },
  {
    id: 'cool',
    name: 'Tông lạnh',
    params: applyPresetGuards(
      {
        ...DEFAULT_PARAMS,
        temperature: -160,
        tint: 4,
        contrast: 4,
        highlights: -6,
        shadows: 4,
        vibrance: 4,
        hsl: {
          ...DEFAULT_PARAMS.hsl,
          orange: { hue: 0, saturation: -6, luminance: 2 }, // guard bảo vệ màu da, max = 0
          yellow: { hue: -2, saturation: -12, luminance: 0 },
          green: { hue: 4, saturation: -10, luminance: 0 },
          aqua: { hue: 0, saturation: 8, luminance: 0 },
          blue: { hue: 0, saturation: 8, luminance: -2 },
        },
      },
      'cool',
    ),
    splitTone: { shadow: { hue: 195, saturation: 8 } },
  },
  {
    id: 'warm',
    name: 'Tông ấm',
    params: clampParams({
      ...DEFAULT_PARAMS,
      temperature: 140,
      tint: -2,
      contrast: 3,
      highlights: -8,
      shadows: 6,
      saturation: 4,
      vibrance: 6,
      hsl: {
        ...DEFAULT_PARAMS.hsl,
        orange: { hue: 1, saturation: 4, luminance: 2 },
        yellow: { hue: -3, saturation: 6, luminance: 1 },
        red: { hue: 0, saturation: 3, luminance: 0 },
        blue: { hue: 0, saturation: -6, luminance: 0 },
      },
    }),
  },
  {
    id: 'film',
    name: 'Film nhạt',
    params: clampParams({
      ...DEFAULT_PARAMS,
      contrast: -8,
      highlights: -12,
      shadows: 8,
      whites: -4,
      blacks: 12,
      temperature: 40,
      tint: 1,
      saturation: -8,
      vibrance: -4,
      hsl: {
        ...DEFAULT_PARAMS.hsl,
        green: { hue: 8, saturation: -8, luminance: 2 },
        orange: { hue: 0, saturation: -4, luminance: 3 },
        yellow: { hue: -4, saturation: -6, luminance: 0 },
      },
    }),
  },
];

/** Nhãn kênh HSL ở dạng khóa. */
export const HSL_KEYS: HslChannelKey[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'magenta',
];

export { clampParams };
