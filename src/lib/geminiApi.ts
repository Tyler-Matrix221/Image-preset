import {
  PARAM_SCHEMAS,
  HSL_CHANNELS,
  HSL_FIELD_SCHEMAS,
  clampParams,
  DEFAULT_PARAMS,
  type EditParams,
  type HslChannelKey,
  type ScalarKey,
} from '@/rules/params';

export const GEMINI_STORAGE_KEY = 'gemini_api_key';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  } catch {
    // localStorage có thể bị chặn ở chế độ private browsing
  }
}

export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Tạo bản sao thu nhỏ của ảnh (cạnh dài tối đa 1024px) để gửi tới Google Gemini API.
 * TUYỆT ĐỐI không gửi ảnh gốc.
 */
export async function createGeminiThumbnail(
  source: HTMLImageElement | HTMLCanvasElement,
  maxSide = 1024,
): Promise<{ base64Data: string; mimeType: string }> {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height;

  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể tạo canvas thu nhỏ để gửi ảnh tới Gemini.');
  }

  ctx.drawImage(source, 0, 0, targetW, targetH);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

  return {
    base64Data,
    mimeType: 'image/jpeg',
  };
}

/**
 * Tự động sinh mô tả schema từ src/rules/params.ts để AI nắm rõ danh sách
 * và giới hạn min–max của từng thông số.
 */
function buildSchemaDescription(): string {
  const scalarRules = PARAM_SCHEMAS.map(
    (s) => `  - "${s.key}": (${s.min} to ${s.max}, default ${s.def}, step ${s.step}) - ${s.label}`,
  ).join('\n');

  const channelNames = HSL_CHANNELS.map((c) => c.key).join(', ');
  const hslFields = HSL_FIELD_SCHEMAS.map(
    (f) => `"${f.key}" (${f.min} to ${f.max}, default ${f.def})`,
  ).join(', ');

  return `
ALLOWED PARAMETERS SCHEMA:
1. Scalar Controls (Light & Color):
${scalarRules}

2. HSL 8 Channels:
  Channels: [${channelNames}]
  Each channel can have: { ${hslFields} }
`;
}

export interface RequestAiSuggestionOptions {
  image: HTMLImageElement | HTMLCanvasElement;
  stylePrompt: string;
  apiKey?: string;
}

/**
 * Gửi ảnh thu nhỏ và yêu cầu phong cách tới Google Gemini 2.5 Flash API.
 * Trả về bộ EditParams đã được lọc whitelist và kẹp an toàn qua clampParams().
 */
export async function requestAiColorSuggestion({
  image,
  stylePrompt,
  apiKey,
}: RequestAiSuggestionOptions): Promise<EditParams> {
  const key = (apiKey || getStoredApiKey()).trim();
  if (!key) {
    throw new Error('Vui lòng nhập Google Gemini API key trong Cài đặt trước khi dùng tính năng này.');
  }

  // 1. Tạo bản sao thu nhỏ 1024px JPEG
  const { base64Data, mimeType } = await createGeminiThumbnail(image, 1024);

  // 2. Chuẩn bị prompt với schema tự động
  const schemaDesc = buildSchemaDescription();
  const promptText = `
You are a master photo colorist and cinematic color grading expert.
Analyze the provided photograph (colors, exposure, skin tones, shadows, mood) and suggest precise color grading adjustment values to fulfill this user style request:
"${stylePrompt || 'Tự nhiên, trong trẻo, da hồng hào, ánh sáng cân đối'}"

CRITICAL RULES:
1. ONLY return a raw, single JSON object containing numeric adjustment parameters from the ALLOWED PARAMETERS SCHEMA below.
2. DO NOT return markdown, code blocks, or explanations. Just pure JSON.
3. NEVER attempt to change image geometry, aspect ratio, composition, or facial anatomy. You only propose color grading numbers.
4. Keep values tasteful, artistic, and balanced so the photograph remains natural without artifacting or over-saturation. Protect realistic human skin tones.

${schemaDesc}

Example response format:
{
  "exposure": 0.15,
  "contrast": 10,
  "highlights": -15,
  "shadows": 12,
  "whites": 4,
  "blacks": -8,
  "temperature": -150,
  "tint": 4,
  "saturation": -4,
  "vibrance": 8,
  "hsl": {
    "orange": { "hue": 0, "saturation": -4, "luminance": 2 },
    "yellow": { "hue": -2, "saturation": -10, "luminance": 0 },
    "blue": { "hue": 0, "saturation": 8, "luminance": -2 }
  }
}
`.trim();

  // 3. Gọi Gemini 2.5 Flash qua REST API
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    key,
  )}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: promptText,
          },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.35,
    },
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    throw new Error('Lỗi kết nối mạng: Không thể kết nối tới Google Gemini API. Vui lòng kiểm tra lại đường truyền Internet.');
  }

  if (!response.ok) {
    let errDetail = '';
    try {
      const errJson = await response.json();
      errDetail = errJson?.error?.message || '';
    } catch {
      // ignore
    }

    if (response.status === 400 || response.status === 403 || response.status === 401) {
      throw new Error(`API key không hợp lệ hoặc không có quyền truy cập Gemini 2.5 Flash.${errDetail ? ` (${errDetail})` : ''}`);
    }
    if (response.status === 429) {
      throw new Error('Đã vượt quá hạn mức gọi Google Gemini API (Rate limit / Quota exceeded). Vui lòng thử lại sau.');
    }
    throw new Error(`Google Gemini API phản hồi lỗi (${response.status}): ${errDetail || response.statusText}`);
  }

  const result = await response.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Gemini không trả về kết quả gợi ý nào cho bức ảnh này.');
  }

  // 4. Phân tích cú pháp JSON
  let parsedJson: any;
  try {
    // Làm sạch nếu model vô tình bọc trong markdown code fence
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsedJson = JSON.parse(cleanedText);
  } catch {
    throw new Error('AI trả về định dạng không phải JSON hợp lệ. Vui lòng thử lại.');
  }

  if (!parsedJson || typeof parsedJson !== 'object') {
    throw new Error('Kết quả từ AI không hợp lệ.');
  }

  // 5. Lọc whitelist chỉ giữ các trường có trong schema
  const base = clampParams(DEFAULT_PARAMS);
  const sanitizedParams: EditParams = {
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

  // Duyệt các trường vô hướng trong whitelist
  for (const s of PARAM_SCHEMAS) {
    if (s.key in parsedJson) {
      const val = parseFloat(parsedJson[s.key]);
      if (!Number.isNaN(val)) {
        sanitizedParams[s.key as ScalarKey] = val;
      }
    }
  }

  // Duyệt các kênh HSL trong whitelist
  if (parsedJson.hsl && typeof parsedJson.hsl === 'object') {
    for (const ch of HSL_CHANNELS) {
      const chData = parsedJson.hsl[ch.key];
      if (chData && typeof chData === 'object') {
        const h = parseFloat(chData.hue);
        const s = parseFloat(chData.saturation);
        const l = parseFloat(chData.luminance);
        if (!Number.isNaN(h)) sanitizedParams.hsl[ch.key].hue = h;
        if (!Number.isNaN(s)) sanitizedParams.hsl[ch.key].saturation = s;
        if (!Number.isNaN(l)) sanitizedParams.hsl[ch.key].luminance = l;
      }
    }
  }

  // 6. BẮT BUỘC kẹp toàn bộ qua clampParams()
  return clampParams(sanitizedParams);
}
