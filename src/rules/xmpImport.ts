import {
  clampParams,
  DEFAULT_PARAMS,
  type EditParams,
  type HslChannelKey,
  type ScalarKey,
  type SplitTone,
} from './params';
import type { Preset } from './presets';

export interface XmpParseResult {
  preset: Preset;
  extractedFieldCount: number;
}

const HSL_CHANNELS: readonly HslChannelKey[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'magenta',
] as const;

/**
 * Trích xuất một giá trị từ chuỗi XML/XMP theo tên thuộc tính CRS.
 * Hỗ trợ các biến thể:
 * - XML attribute: crs:Key="..." hoặc Key="..."
 * - XML node: <crs:Key>...</crs:Key> hoặc <Key>...</Key>
 * - Regex fallback: nếu DOMParser không phân tích được
 */
function extractCrsValue(text: string, xmlDoc: Document | null, key: string): string | null {
  const lowerKey = key.toLowerCase();

  // 1. Thử dùng DOM Document nếu có
  if (xmlDoc) {
    const tagVariants = [`crs:${key}`, key, `crs:${lowerKey}`, lowerKey];
    for (const tag of tagVariants) {
      try {
        const el = xmlDoc.querySelector(tag) || xmlDoc.getElementsByTagName(tag)[0];
        if (el && el.textContent && el.textContent.trim().length > 0) {
          return el.textContent.trim();
        }
      } catch {
        // bỏ qua lỗi selector không hợp lệ nếu có
      }
    }

    // Tìm trong attributes của tất cả elements (thường nằm ở <rdf:Description>)
    const allEls = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      for (let j = 0; j < el.attributes.length; j++) {
        const attr = el.attributes[j];
        const name = attr.name;
        const nameLower = name.toLowerCase();
        if (
          name === `crs:${key}` ||
          nameLower === `crs:${lowerKey}` ||
          name === key ||
          nameLower === lowerKey ||
          nameLower.endsWith(`:${lowerKey}`)
        ) {
          if (attr.value && attr.value.trim().length > 0) {
            return attr.value.trim();
          }
        }
      }
    }
  }

  // 2. Fallback bằng Regex tìm attribute hoặc tag
  const reAttr = new RegExp(`(?:crs:)?${key}\\s*=\\s*["']([^"']*)["']`, 'i');
  const mAttr = text.match(reAttr);
  if (mAttr && mAttr[1] !== undefined && mAttr[1].trim().length > 0) {
    return mAttr[1].trim();
  }

  const reTag = new RegExp(`<(?:crs:)?${key}[^>]*>([^<]*)<\\/(?:crs:)?${key}>`, 'i');
  const mTag = text.match(reTag);
  if (mTag && mTag[1] !== undefined && mTag[1].trim().length > 0) {
    return mTag[1].trim();
  }

  return null;
}

/**
 * Trích xuất tên preset:
 * 1. Thuộc tính crs:Name="Tên"
 * 2. Cấu trúc lồng <crs:Name><rdf:Alt><rdf:li>Tên</rdf:li></rdf:Alt></crs:Name>
 * 3. Thẻ đơn <crs:Name>Tên</crs:Name>
 * 4. Fallback về tên file không có đuôi .xmp
 */
function extractPresetName(text: string, xmlDoc: Document | null, fileName: string): string {
  // 1. Thử qua DOM Document
  if (xmlDoc) {
    const nameTags = ['crs\\:Name', 'crs:Name', 'Name', 'name'];
    for (const tag of nameTags) {
      try {
        const el = xmlDoc.querySelector(tag) || xmlDoc.getElementsByTagName(tag)[0];
        if (el) {
          const li =
            el.querySelector('li') ||
            el.getElementsByTagName('rdf:li')[0] ||
            el.getElementsByTagName('li')[0];
          if (li && li.textContent && li.textContent.trim().length > 0) {
            return li.textContent.trim();
          }
          if (el.textContent && el.textContent.trim().length > 0) {
            return el.textContent.trim();
          }
        }
      } catch {
        // bỏ qua
      }
    }

    const allEls = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allEls.length; i++) {
      const el = allEls[i];
      for (let j = 0; j < el.attributes.length; j++) {
        const attr = el.attributes[j];
        if (
          attr.name === 'crs:Name' ||
          attr.name.toLowerCase() === 'crs:name' ||
          attr.name === 'Name'
        ) {
          if (attr.value && attr.value.trim().length > 0) {
            return attr.value.trim();
          }
        }
      }
    }
  }

  // 2. Regex: crs:Name dạng attribute
  const reAttr = /(?:crs:)?Name\s*=\s*["']([^"']+)["']/i;
  const mAttr = text.match(reAttr);
  if (mAttr && mAttr[1]?.trim()) {
    return mAttr[1].trim();
  }

  // 3. Regex: crs:Name lồng rdf:li (chuẩn Lightroom/Camera Raw)
  const reLi =
    /<(?:crs:)?Name[^>]*>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>[\s\S]*?<\/(?:crs:)?Name>/i;
  const mLi = text.match(reLi);
  if (mLi && mLi[1]?.trim()) {
    return mLi[1].trim();
  }

  // 4. Regex: crs:Name dạng thẻ đơn
  const reSimple = /<(?:crs:)?Name[^>]*>([^<]+)<\/(?:crs:)?Name>/i;
  const mSimple = text.match(reSimple);
  if (mSimple && mSimple[1]?.trim()) {
    return mSimple[1].trim();
  }

  // 5. Fallback lấy tên file
  const cleaned = fileName.replace(/\.[^/.]+$/, '').trim();
  return cleaned.length > 0 ? cleaned : 'Preset đã nhập';
}

/**
 * Phân tích nội dung file .xmp và chuyển đổi thành Preset hợp lệ của app.
 * BẮT BUỘC: mọi thông số đều đi qua clampParams() trước khi trả về.
 *
 * @param xmpContent Chuỗi nội dung text của file .xmp
 * @param fileName Tên file gốc tải lên từ máy người dùng
 * @returns XmpParseResult chứa Preset và số lượng thuộc tính đã đọc được
 * @throws Error nếu file không phải XMP hoặc không đọc được thông số Camera Raw nào
 */
export function parseXmpPreset(xmpContent: string, fileName: string): XmpParseResult {
  if (!xmpContent || typeof xmpContent !== 'string' || xmpContent.trim().length === 0) {
    throw new Error('Nội dung file .xmp trống hoặc không đọc được.');
  }

  // Kiểm tra sơ bộ định dạng file XMP / RDF / Camera Raw
  const hasXmpSignature = /xmpmeta|<rdf:RDF|xmlns:crs|crs:/i.test(xmpContent);
  if (!hasXmpSignature) {
    throw new Error('File không phải định dạng preset Adobe Camera Raw (.xmp) hợp lệ.');
  }

  let xmlDoc: Document | null = null;
  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmpContent, 'application/xml');
      if (!doc.querySelector('parsererror')) {
        xmlDoc = doc;
      }
    }
  } catch {
    xmlDoc = null;
  }

  let extractedCount = 0;

  // Khởi tạo bộ thông số nền tảng từ mặc định của app
  const base = clampParams(DEFAULT_PARAMS);
  const rawParams: EditParams = {
    ...base,
    hsl: {
      red: { ...base.hsl.red },
      orange: { ...base.hsl.orange },
      yellow: { ...base.hsl.yellow },
      green: { ...base.hsl.green },
      aqua: { ...base.hsl.aqua },
      blue: { ...base.hsl.blue },
      purple: { ...base.hsl.purple },
      magenta: { ...base.hsl.magenta },
    },
  };

  // 1. Ánh xạ các thông số Ánh sáng & Màu sắc vô hướng (Scalars)
  const scalarMap: { crsKey: string; appKey: ScalarKey }[] = [
    { crsKey: 'Exposure2012', appKey: 'exposure' },
    { crsKey: 'Contrast2012', appKey: 'contrast' },
    { crsKey: 'Highlights2012', appKey: 'highlights' },
    { crsKey: 'Shadows2012', appKey: 'shadows' },
    { crsKey: 'Whites2012', appKey: 'whites' },
    { crsKey: 'Blacks2012', appKey: 'blacks' },
    { crsKey: 'Tint', appKey: 'tint' },
    { crsKey: 'Vibrance', appKey: 'vibrance' },
    { crsKey: 'Saturation', appKey: 'saturation' },
  ];

  for (const { crsKey, appKey } of scalarMap) {
    const valStr = extractCrsValue(xmpContent, xmlDoc, crsKey);
    if (valStr !== null) {
      const val = parseFloat(valStr);
      if (!Number.isNaN(val)) {
        rawParams[appKey] = val;
        extractedCount++;
      }
    }
  }

  // 2. Quy đổi Temperature:
  // Temperature trong file .xmp là nhiệt độ màu tuyệt đối (ví dụ 4800K):
  // quy đổi thành độ lệch so với mốc trung tính 5500K (4800 → −700).
  const tempStr = extractCrsValue(xmpContent, xmlDoc, 'Temperature');
  if (tempStr !== null) {
    const tempNum = parseFloat(tempStr);
    if (!Number.isNaN(tempNum)) {
      if (tempNum >= 1000) {
        rawParams.temperature = tempNum - 5500;
      } else {
        rawParams.temperature = tempNum;
      }
      extractedCount++;
    }
  }

  // 3. Ánh xạ HSL 8 kênh màu
  for (const channel of HSL_CHANNELS) {
    const capitalized = channel.charAt(0).toUpperCase() + channel.slice(1);

    const hueStr = extractCrsValue(xmpContent, xmlDoc, `HueAdjustment${capitalized}`);
    if (hueStr !== null) {
      const hue = parseFloat(hueStr);
      if (!Number.isNaN(hue)) {
        rawParams.hsl[channel].hue = hue;
        extractedCount++;
      }
    }

    const satStr = extractCrsValue(xmpContent, xmlDoc, `SaturationAdjustment${capitalized}`);
    if (satStr !== null) {
      const sat = parseFloat(satStr);
      if (!Number.isNaN(sat)) {
        rawParams.hsl[channel].saturation = sat;
        extractedCount++;
      }
    }

    const lumStr = extractCrsValue(xmpContent, xmlDoc, `LuminanceAdjustment${capitalized}`);
    if (lumStr !== null) {
      const lum = parseFloat(lumStr);
      if (!Number.isNaN(lum)) {
        rawParams.hsl[channel].luminance = lum;
        extractedCount++;
      }
    }
  }

  // 4. Split Toning vùng tối
  let splitTone: SplitTone | undefined = undefined;
  const shadowHueStr = extractCrsValue(xmpContent, xmlDoc, 'SplitToningShadowHue');
  const shadowSatStr = extractCrsValue(xmpContent, xmlDoc, 'SplitToningShadowSaturation');

  if (shadowSatStr !== null) {
    const sat = parseFloat(shadowSatStr);
    const hue = shadowHueStr !== null ? parseFloat(shadowHueStr) : 0;
    if (!Number.isNaN(sat) && sat > 0) {
      splitTone = {
        shadow: {
          hue: Number.isNaN(hue) ? 0 : Math.min(360, Math.max(0, hue)),
          saturation: Math.min(100, Math.max(0, sat)),
        },
      };
      extractedCount++;
    }
  }

  // Kiểm tra nếu không trích xuất được thông số nào
  if (extractedCount === 0) {
    throw new Error(
      'Không đọc được thông số Camera Raw nào từ file .xmp này. Vui lòng kiểm tra lại file.',
    );
  }

  // 5. Tên preset
  const presetName = extractPresetName(xmpContent, xmlDoc, fileName);

  // 6. BẮT BUỘC: Mọi giá trị import đều phải đi qua clampParams() trước khi dùng
  const finalParams = clampParams(rawParams);

  const newPreset: Preset = {
    id: `xmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: presetName,
    params: finalParams,
    ...(splitTone ? { splitTone } : {}),
  };

  return {
    preset: newPreset,
    extractedFieldCount: extractedCount,
  };
}
