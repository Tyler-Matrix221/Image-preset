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
 * Tạo bản sao thu nhỏ của ảnh (cạnh dài tối đa 512px, JPEG quality 0.75) để gửi tới Google Gemini API.
 * Giảm tải dung lượng mạng ~10 lần (từ 500KB xuống ~40KB), giúp upload nhanh tức thì.
 * TUYỆT ĐỐI không gửi ảnh gốc.
 */
export async function createGeminiThumbnail(
  source: HTMLImageElement | HTMLCanvasElement,
  maxSide = 512,
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

  const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
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

/**
 * Trích xuất chuỗi JSON từ kết quả trả về của Google Gemini API
 * (Hỗ trợ cả Interactions API mới và generateContent API truyền thống).
 */
function extractOutputText(result: any): string | null {
  if (!result || typeof result !== 'object') return null;

  // 1. Output dạng text trực tiếp từ Interactions API
  if (typeof result.output_text === 'string' && result.output_text.trim()) {
    return result.output_text.trim();
  }

  // 2. Output từ timeline steps của Interactions API
  if (Array.isArray(result.steps)) {
    for (const step of result.steps) {
      if (Array.isArray(step?.content)) {
        for (const item of step.content) {
          if (item?.type === 'text' && typeof item?.text === 'string' && item.text.trim()) {
            return item.text.trim();
          }
        }
      }
    }
  }

  // 3. Output từ generateContent API truyền thống
  const candidateText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof candidateText === 'string' && candidateText.trim()) {
    return candidateText.trim();
  }

  return null;
}

export interface RequestAiSuggestionOptions {
  image: HTMLImageElement | HTMLCanvasElement;
  stylePrompt: string;
  apiKey?: string;
}

/**
 * Gửi ảnh thu nhỏ và yêu cầu phong cách tới Google Gemini 3.8 Flash API.
 * Hỗ trợ Interactions API hiện đại và tự động fallback sang generateContent.
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

  // 1. Tạo bản sao thu nhỏ 512px JPEG (giảm tải dung lượng ~15 lần)
  const { base64Data, mimeType } = await createGeminiThumbnail(image, 512);

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

  // 3. Chuẩn bị 2 cơ chế gọi API:
  // - Lựa chọn 1: Interactions API hiện đại (/v1beta/interactions) được Google khuyến nghị cho gemini-3.8-flash
  // - Lựa chọn 2: generateContent API truyền thống (/v1beta/models/gemini-3.8-flash:generateContent)
  const endpointsToTry = [
    {
      name: 'Interactions API',
      url: `https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(key)}`,
      body: {
        model: 'gemini-3.8-flash',
        input: [
          {
            type: 'text',
            text: promptText,
          },
          {
            type: 'image',
            data: base64Data,
            mime_type: mimeType,
          },
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
        },
      },
    },
    {
      name: 'generateContent API',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(key)}`,
      body: {
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
      },
    },
  ];

  const REQUEST_TIMEOUT_MS = 30000;
  let response: Response | null = null;
  let lastErrorDetail = '';
  let lastStatus = 0;

  for (const ep of endpointsToTry) {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      response = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key,
        },
        body: JSON.stringify(ep.body),
        signal: controller.signal,
      });
    } catch (netErr: any) {
      clearTimeout(timeoutTimer);
      if (netErr?.name === 'AbortError') {
        lastErrorDetail = 'Yêu cầu kết nối quá 30 giây (Timeout). Vui lòng thử lại.';
        continue;
      }
      lastErrorDetail = 'Không thể kết nối tới Google Gemini API (Lỗi mạng).';
      continue;
    } finally {
      clearTimeout(timeoutTimer);
    }

    if (response.ok) {
      break;
    }

    lastStatus = response.status;
    try {
      const errJson = await response.json();
      lastErrorDetail = errJson?.error?.message || errJson?.[0]?.error?.message || response.statusText;
    } catch {
      lastErrorDetail = response.statusText;
    }

    // Nếu key sai hoặc không có quyền (400, 401, 403), dừng ngay
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(
        `API key không hợp lệ hoặc không có quyền truy cập Gemini.${lastErrorDetail ? ` (${lastErrorDetail})` : ''}`,
      );
    }

    console.warn(`[Gemini API] Endpoint ${ep.name} phản hồi ${response.status}: ${lastErrorDetail}. Đang thử endpoint dự phòng...`);
  }

  if (!response || !response.ok) {
    if (lastStatus === 429) {
      throw new Error(
        'Đã vượt quá hạn mức gọi Google Gemini API (Rate limit / Quota exceeded). Vui lòng thử lại sau ít phút.',
      );
    }
    if (
      lastStatus === 503 ||
      lastErrorDetail.toLowerCase().includes('demand') ||
      lastErrorDetail.toLowerCase().includes('overloaded')
    ) {
      throw new Error(
        'Máy chủ Google Gemini (gemini-3.8-flash) đang có lưu lượng truy cập cao đột biến. Vui lòng bấm thử lại sau vài giây.',
      );
    }
    throw new Error(`Google Gemini API phản hồi lỗi: ${lastErrorDetail || `Mã HTTP ${lastStatus}`}`);
  }

  const result = await response.json();
  const rawText = extractOutputText(result);

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
