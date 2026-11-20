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

function applyPresetGuards(params: EditParams, presetId: string): EditParams {
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
        temperature: -650,
        tint: 5,
        hsl: {
          ...DEFAULT_PARAMS.hsl,
          orange: { hue: 0, saturation: -8, luminance: 0 }, // guard màu da, max = 0
          yellow: { hue: 0, saturation: -20, luminance: 0 },
          green: { hue: 0, saturation: -25, luminance: 0 },
          blue: { hue: 0, saturation: 10, luminance: 0 },
        },
      },
      'cool',
    ),
    splitTone: { shadow: { hue: 190, saturation: 12 } },
  },
  {
    id: 'warm',
    name: 'Tông ấm',
    params: clampParams({
      ...DEFAULT_PARAMS,
      temperature: 400,
      saturation: 5,
    }),
  },
  {
    id: 'film',
    name: 'Film nhạt',
    params: clampParams({
      ...DEFAULT_PARAMS,
      contrast: -20,
      highlights: -25,
      blacks: 25,
      saturation: -20,
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
