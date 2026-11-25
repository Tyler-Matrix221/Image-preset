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

/**
 * URL của Cloudflare Worker Proxy dùng chung cho chế độ dùng thử miễn phí.
 * Được cấu hình qua biến môi trường VITE_DEMO_PROXY_URL khi build.
 */
export const DEMO_PROXY_URL = (import.meta.env.VITE_DEMO_PROXY_URL || '').trim().replace(/\/+$/, '');

export interface DemoQuota {
  limit: number;
  remaining: number;
}

let cachedDemoQuota: DemoQuota | null = null;

export class DemoLimitReachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoLimitReachedError';
  }
}

export function hasDemoProxy(): boolean {
  return Boolean(DEMO_PROXY_URL);
}

export function hasAiAccess(): boolean {
  return Boolean(getStoredApiKey() || DEMO_PROXY_URL);
}

export function getDemoQuota(): DemoQuota | null {
  return cachedDemoQuota;
}

export async function fetchDemoQuota(): Promise<DemoQuota | null> {
  if (!DEMO_PROXY_URL) return null;
  try {
    const res = await fetch(`${DEMO_PROXY_URL}/quota`);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.limit === 'number' && typeof data?.remaining === 'number') {
      cachedDemoQuota = { limit: data.limit, remaining: data.remaining };
      return cachedDemoQuota;
    }
  } catch {
    // ignore network error
  }
  return cachedDemoQuota;
}

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

// Danh sách các model Flash tối ưu được kiểm chứng phản hồi siêu nhanh (< 2 giây) trên Google Gemini:
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

/**
 * Gọi Gemini REST API với cơ chế tự động chuyển model dự phòng khi model gặp sự cố.
 */
async function callGeminiFlash(payload: any, apiKey: string): Promise<string> {
  const PER_MODEL_TIMEOUT_MS = 15000;
  const useProxy = !apiKey && Boolean(DEMO_PROXY_URL);
  if (!apiKey && !useProxy) {
    throw new Error('Vui lòng nhập Google Gemini API key trong Cài đặt trước khi dùng tính năng AI.');
  }

  let response: Response | null = null;
  let lastErrorDetail = '';
  let lastStatus = 0;

  for (const model of CANDIDATE_MODELS) {
    const endpoint = useProxy
      ? DEMO_PROXY_URL
      : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
          apiKey,
        )}`;

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), PER_MODEL_TIMEOUT_MS);

    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(useProxy ? { model, payload } : payload),
        signal: controller.signal,
      });
    } catch (netErr: any) {
      clearTimeout(timeoutTimer);
      if (netErr?.name === 'AbortError') {
        console.warn(`[Gemini API] Model ${model} quá 15s. Tự động chuyển model kế tiếp...`);
        lastErrorDetail = 'Quá thời gian phản hồi.';
        continue;
      }
      lastErrorDetail = 'Không thể kết nối tới Google Gemini API (Lỗi mạng).';
      continue;
    } finally {
      clearTimeout(timeoutTimer);
    }

    if (useProxy) {
      const limitHeader = Number(response.headers.get('X-RateLimit-Limit'));
      const remHeader = Number(response.headers.get('X-RateLimit-Remaining'));
      if (Number.isFinite(limitHeader) && Number.isFinite(remHeader) && limitHeader > 0) {
        cachedDemoQuota = { limit: limitHeader, remaining: remHeader };
      }
    }

    if (response.ok) {
      break;
    }

    lastStatus = response.status;
    let errCode = '';
    try {
      const errJson = await response.json();
      errCode = errJson?.code || '';
      lastErrorDetail =
        errJson?.error?.message ||
        (typeof errJson?.error === 'string' ? errJson.error : '') ||
        errJson?.[0]?.error?.message ||
        response.statusText;
    } catch {
      lastErrorDetail = response.statusText;
    }

    if (useProxy && response.status === 429 && errCode === 'DAILY_LIMIT_REACHED') {
      cachedDemoQuota = {
        limit: cachedDemoQuota?.limit || 5,
        remaining: 0,
      };
      throw new DemoLimitReachedError(
        lastErrorDetail ||
          'Bạn đã dùng hết lượt AI miễn phí hôm nay. Hãy nhập Gemini API Key cá nhân để tiếp tục hoặc quay lại vào ngày mai.',
      );
    }

    // Nếu key sai hoặc không có quyền (400, 401, 403), dừng ngay
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new Error(
        `API key không hợp lệ hoặc không có quyền truy cập Gemini.${lastErrorDetail ? ` (${lastErrorDetail})` : ''}`,
      );
    }

    console.warn(`[Gemini API] Model ${model} phản hồi ${response.status}: ${lastErrorDetail}. Đang thử model tiếp theo...`);
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
        'Máy chủ Google Gemini hiện đang có lưu lượng truy cập cao đột biến. Vui lòng bấm thử lại sau vài giây.',
      );
    }
    throw new Error(`Google Gemini API phản hồi lỗi: ${lastErrorDetail || `Mã HTTP ${lastStatus}`}`);
  }

  const result = await response.json();
  const rawText = extractOutputText(result);

  if (!rawText) {
    throw new Error('Gemini không trả về kết quả gợi ý nào cho bức ảnh này.');
  }

  return rawText;
}

/**
 * Phân tích và lọc an toàn chuỗi JSON từ AI qua whitelist và clampParams.
 */
function parseAndSanitizeAiParams(rawText: string): { params: EditParams; suggestedName?: string } {
  let parsedJson: any;
  try {
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    parsedJson = JSON.parse(cleanedText);
  } catch {
    throw new Error('AI trả về định dạng không phải JSON hợp lệ. Vui lòng thử lại.');
  }

  if (!parsedJson || typeof parsedJson !== 'object') {
    throw new Error('Kết quả từ AI không hợp lệ.');
  }

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

  const suggestedName =
    typeof parsedJson.suggestedName === 'string' && parsedJson.suggestedName.trim()
      ? parsedJson.suggestedName.trim().slice(0, 30)
      : undefined;

  return {
    params: clampParams(sanitizedParams),
    suggestedName,
  };
}

export interface RequestAiSuggestionOptions {
  image: HTMLImageElement | HTMLCanvasElement;
  stylePrompt: string;
  apiKey?: string;
}

/**
 * Gửi ảnh thu nhỏ và yêu cầu phong cách tới Google Gemini Flash API.
 * Trả về bộ EditParams đã được lọc whitelist và kẹp an toàn qua clampParams().
 */
export async function requestAiColorSuggestion({
  image,
  stylePrompt,
  apiKey,
}: RequestAiSuggestionOptions): Promise<EditParams> {
  const key = (apiKey || getStoredApiKey()).trim();
  if (!key && !DEMO_PROXY_URL) {
    throw new Error('Vui lòng nhập Google Gemini API key trong Cài đặt trước khi dùng tính năng này.');
  }

  const { base64Data, mimeType } = await createGeminiThumbnail(image, 512);
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

  const payload = {
    contents: [
      {
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

  const rawText = await callGeminiFlash(payload, key);
  const { params } = parseAndSanitizeAiParams(rawText);
  return params;
}

export interface ClonePresetOptions {
  referenceImage: HTMLImageElement | HTMLCanvasElement;
  customName?: string;
  apiKey?: string;
}

/**
 * Cách 1: Hút màu từ 1 bức ảnh mẫu (Reference Image) tải trên mạng (TikTok/FB/Pinterest)
 * và tạo ra một Preset mới hoàn chỉnh.
 */
export async function clonePresetFromReferenceImage({
  referenceImage,
  customName,
  apiKey,
}: ClonePresetOptions): Promise<{ params: EditParams; name: string }> {
  const key = (apiKey || getStoredApiKey()).trim();
  if (!key && !DEMO_PROXY_URL) {
    throw new Error('Vui lòng nhập Google Gemini API key trong Cài đặt trước khi dùng tính năng này.');
  }

  const { base64Data, mimeType } = await createGeminiThumbnail(referenceImage, 512);
  const schemaDesc = buildSchemaDescription();
  const promptText = `
You are a master cinematic colorist.
Analyze this reference photograph (color palette, tone curve, lighting mood, highlights, shadows, white balance, and 8 HSL color channels).
Reverse-engineer the color grading parameters according to the ALLOWED PARAMETERS SCHEMA so that other baseline photos can adopt this exact aesthetic and color mood.
Also suggest a short, elegant title for this preset in Vietnamese (e.g. "Nắng Hoàng Hôn", "Phim Cổ Điển", "Nàng Thơ Douyin", "Clean Girl Trong Trẻo") in the "suggestedName" field.

CRITICAL RULES:
1. ONLY return a raw, single JSON object containing numeric adjustment parameters from the ALLOWED PARAMETERS SCHEMA plus "suggestedName".
2. DO NOT return markdown or explanations. Pure JSON only.
3. NEVER attempt to change image geometry, resolution, or facial structure. You only propose color adjustment numbers.

${schemaDesc}

Example response format:
{
  "suggestedName": "Tông Ấm Hoàng Hôn",
  "exposure": 0.1,
  "contrast": 12,
  "highlights": -10,
  "shadows": 8,
  "whites": 5,
  "blacks": -6,
  "temperature": 180,
  "tint": 2,
  "saturation": 6,
  "vibrance": 10,
  "hsl": {
    "orange": { "hue": 0, "saturation": -2, "luminance": 4 },
    "blue": { "hue": -4, "saturation": 6, "luminance": -2 }
  }
}
`.trim();

  const payload = {
    contents: [
      {
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

  const rawText = await callGeminiFlash(payload, key);
  const { params, suggestedName } = parseAndSanitizeAiParams(rawText);

  const finalName = customName?.trim() || suggestedName || 'Preset từ ảnh mẫu';
  return {
    params,
    name: finalName,
  };
}

export interface MatchColorsOptions {
  targetImage: HTMLImageElement | HTMLCanvasElement;
  referenceImage: HTMLImageElement | HTMLCanvasElement;
  apiKey?: string;
}

/**
 * Cách 2: So sánh cặp 2 ảnh (Target Image A + Reference Image B) để tìm bộ thông số bù trừ màu,
 * giúp Ảnh A đạt được màu sắc và mood tương đồng nhất với Ảnh B.
 */
export async function matchColorsBetweenImages({
  targetImage,
  referenceImage,
  apiKey,
}: MatchColorsOptions): Promise<EditParams> {
  const key = (apiKey || getStoredApiKey()).trim();
  if (!key && !DEMO_PROXY_URL) {
    throw new Error('Vui lòng nhập Google Gemini API key trong Cài đặt trước khi dùng tính năng này.');
  }

  const [thumbA, thumbB] = await Promise.all([
    createGeminiThumbnail(targetImage, 512),
    createGeminiThumbnail(referenceImage, 512),
  ]);

  const schemaDesc = buildSchemaDescription();
  const promptText = `
You are an expert Hollywood digital colorist performing professional Color Matching.
Image 1 is the user's TARGET photo (the baseline unedited photo that needs color grading).
Image 2 is the REFERENCE photo (the style model whose color grade, lighting mood, color contrast, and palette the user wants to transfer onto Image 1).

Compare Image 1 and Image 2:
1. Analyze the delta in exposure, contrast, white balance (temperature/tint), dynamic range (highlights, shadows, whites, blacks), and 8 HSL color channels.
2. Determine the exact adjustment parameters from the ALLOWED PARAMETERS SCHEMA to apply onto Image 1 so that Image 1 transforms to closely match the color grading aesthetic, mood, and tones of Image 2.
3. If human subjects are present in Image 1, protect flattering natural skin tones while adopting the reference color atmosphere.

CRITICAL RULES:
1. ONLY return a raw, single JSON object containing numeric adjustment parameters from the ALLOWED PARAMETERS SCHEMA.
2. DO NOT return markdown or explanations. Just pure JSON.
3. NEVER attempt to change image geometry, composition, or facial anatomy. You only propose color grading numbers.

${schemaDesc}

Example response format:
{
  "exposure": 0.15,
  "contrast": 15,
  "highlights": -12,
  "shadows": 10,
  "whites": 4,
  "blacks": -5,
  "temperature": -120,
  "tint": 6,
  "saturation": -4,
  "vibrance": 8,
  "hsl": {
    "orange": { "hue": 0, "saturation": -4, "luminance": 2 },
    "blue": { "hue": 5, "saturation": 10, "luminance": -4 }
  }
}
`.trim();

  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: thumbA.mimeType,
              data: thumbA.base64Data,
            },
          },
          {
            inline_data: {
              mime_type: thumbB.mimeType,
              data: thumbB.base64Data,
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

  const rawText = await callGeminiFlash(payload, key);
  const { params } = parseAndSanitizeAiParams(rawText);
  return params;
}
