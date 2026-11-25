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
import { POSE_TEMPLATES } from '@/rules/poseTemplates';
import type { PhotoExif } from '@/lib/exifReader';

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

export interface Point2D {
  x: number;
  y: number;
}

export interface DynamicSkeleton {
  head: Point2D;
  neck: Point2D;
  lShoulder: Point2D;
  rShoulder: Point2D;
  lElbow: Point2D;
  rElbow: Point2D;
  lWrist: Point2D;
  rWrist: Point2D;
  lHip: Point2D;
  rHip: Point2D;
  lKnee: Point2D;
  rKnee: Point2D;
  lAnkle: Point2D;
  rAnkle: Point2D;
}

export interface PoseSuggestion {
  poseId: string;
  tip: string;
  xPercent: number;
  yPercent: number;
  scale: number;
  flipHorizontal?: boolean;
  skeleton?: DynamicSkeleton;
}

export interface SuggestedCrop {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  rotateDeg: number;
}

export interface ShootingGuideResult {
  lightingSummary: string;
  angleAdvice: string;
  cameraSettings: {
    aperture: string;
    shutterSpeed: string;
    iso: string;
    whiteBalance: string;
    ev: string;
  };
  poses: PoseSuggestion[];
  suggestedCrop?: SuggestedCrop;
}

export type ModelGender = 'female' | 'male' | 'couple';

export interface AnalyzeSceneOptions {
  sceneImage: HTMLImageElement | HTMLCanvasElement;
  referenceImage?: HTMLImageElement | HTMLCanvasElement | null;
  exif?: PhotoExif | null;
  modelGender?: ModelGender;
  apiKey?: string;
}

/**
 * Phân tích ảnh bối cảnh (kèm EXIF và ảnh mẫu góc nếu có) để gợi ý:
 * 1. Thông số máy ảnh (Khẩu độ, Tốc độ, ISO, Cân bằng trắng, EV)
 * 2. Góc máy & bố cục cần điều chỉnh
 * 3. 3–4 tư thế tạo dáng phù hợp kèm tọa độ đặt khung SVG nét trắng.
 */
export async function analyzeShootingScene({
  sceneImage,
  referenceImage,
  exif,
  modelGender = 'female',
  apiKey,
}: AnalyzeSceneOptions): Promise<ShootingGuideResult> {
  const key = (apiKey || getStoredApiKey()).trim();
  if (!key && !DEMO_PROXY_URL) {
    throw new Error('Vui lòng nhập Google Gemini API key trong Cài đặt trước khi dùng tính năng này.');
  }

  const thumbScene = await createGeminiThumbnail(sceneImage, 512);
  const thumbRef = referenceImage ? await createGeminiThumbnail(referenceImage, 512) : null;

  const poseCatalog = POSE_TEMPLATES.map(
    (p) => `- "${p.id}" (${p.name}): ${p.visualDescription}`,
  ).join('\n');

  const exifNote = exif
    ? `Current test shot EXIF metadata: ISO ${exif.iso ?? 'unknown'}, Aperture f/${exif.fNumber ?? 'unknown'}, Shutter ${exif.exposureTime ?? 'unknown'}, Focal ${exif.focalLength ?? 'unknown'}mm, Camera: ${exif.cameraModel ?? 'unknown'}.`
    : 'No EXIF metadata available.';

  const modelNote =
    modelGender === 'male'
      ? 'Subject is a MALE model: favor confident, relaxed masculine poses (broad shoulders, hands in pocket, leaning casually, natural knee stance).'
      : modelGender === 'couple'
      ? 'Subject is a COUPLE (2 people): favor natural, affectionate couple poses (including "couple-standing").'
      : 'Subject is a FEMALE model: favor graceful, flattering feminine poses (S-curve, soft shoulder tilt, gentle hand near hair/face/prop, crossed or stepped leg).';

  const promptText = `
You are a professional portrait & lifestyle photographer coaching a beginner on location.
Image 1 is the current SCENE / TEST SHOT taken by the user.
${thumbRef ? 'Image 2 is a REFERENCE photo whose composition, camera angle, or pose the user wants to replicate in Image 1.' : ''}
${exifNote}
${modelNote}

Analyze Image 1 carefully and return practical, easy-to-follow guidance in VIETNAMESE:
1. "lightingSummary": Brief 1-sentence summary of the lighting & environment (e.g. "Nắng chiều chếch bên phải, hậu cảnh sáng").
2. "angleAdvice": Concise 1–2 sentences telling the photographer how to adjust camera angle, distance, or framing for better balance (e.g. "Hạ máy thấp ngang hông, bước sang trái 1 bước để tránh cột phía sau và đặt chủ thể ở 1/3 phải").
3. "cameraSettings": Starting-point camera settings tailored to this lighting:
   - "aperture": e.g. "f/2.8"
   - "shutterSpeed": e.g. "1/250s"
   - "iso": e.g. "200"
   - "whiteBalance": e.g. "5400K"
   - "ev": e.g. "+0.3 EV"
4. "poses": Pick 3 to 4 best poses from the ALLOWED POSE IDS below for this scene. For each pose provide:
   - "poseId": exact id from the list
   - "tip": 1 short, natural Vietnamese instruction for the model. CRITICAL RULE FOR "tip": Your "tip" MUST accurately match the EXACT body/hand/leg posture of the chosen "poseId" description below! Do NOT invent hand, prop, sitting, or leg actions that contradict that pose's drawing.
   - "xPercent": number 18..82 (horizontal % of Image 1 width where the center of the person should stand; 0=left edge of Image 1, 100=right edge of Image 1). CRITICAL: If "tip" mentions standing next to a chair/table/railing, place "xPercent" BESIDE that object (never directly on top of the chair!), on open floor space.
   - "yPercent": number 42..75 (vertical % of Image 1 height for the center of the person; keep feet grounded naturally on the floor/ground, NOT floating above furniture!).
   - "scale": number 0.55..1.15 (realistic human height relative to Image 1 height)
   - "flipHorizontal": boolean. Follow the photography Lead Room rule: if the person stands on the left side (xPercent < 50), orient them facing/leaning toward the center-right background; if on the right side (xPercent > 50), orient them toward center-left.
   - "skeleton": An object of 14 anatomical body joint coordinates in Image 1 (% of Image 1 width x=0..100 and height y=0..100) so the app can draw a custom flexible pose outline directly interacting with furniture/ground in Image 1 (e.g. sitting ON a chair, resting a hand ON a railing/armrest, standing BESIDE a chair with feet on the floor). Keys required:
     "head", "neck", "lShoulder", "rShoulder", "lElbow", "rElbow", "lWrist", "rWrist", "lHip", "rHip", "lKnee", "rKnee", "lAnkle", "rAnkle", each as {"x": number, "y": number}.
     Make sure proportions are realistic human anatomy and match your "tip" text!
5. "suggestedCrop": Propose a cleaner framing crop box on Image 1 so the photographer can see the ideal composition (removing messy edges, zooming closer to the main background/chair/anchor, placing key elements on the rule-of-thirds):
   - "xPercent": number 0..45 (left edge of crop box as % of Image 1 width)
   - "yPercent": number 0..45 (top edge of crop box as % of Image 1 height)
   - "widthPercent": number 45..100 (width of crop box as % of Image 1 width; xPercent + widthPercent <= 100)
   - "heightPercent": number 45..100 (height of crop box as % of Image 1 height; yPercent + heightPercent <= 100)
   - "rotateDeg": number -5..5 (small tilt correction in degrees if the horizon/verticals are slightly crooked, 0 if straight)

ALLOWED POSE IDS:
${poseCatalog}

CRITICAL RULES:
- ONLY return a single raw JSON object. No markdown, no explanations.
`.trim();

  const parts: any[] = [
    {
      inline_data: {
        mime_type: thumbScene.mimeType,
        data: thumbScene.base64Data,
      },
    },
  ];

  if (thumbRef) {
    parts.push({
      inline_data: {
        mime_type: thumbRef.mimeType,
        data: thumbRef.base64Data,
      },
    });
  }

  parts.push({ text: promptText });

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.3,
    },
  };

  const rawText = await callGeminiFlash(payload, key);
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Không đọc được kết quả phân tích góc chụp từ AI.');
  }

  const validIds = new Set(POSE_TEMPLATES.map((p) => p.id));
  const rawPoses: any[] = Array.isArray(parsed?.poses) ? parsed.poses : [];

  const parseSkeleton = (raw: any): DynamicSkeleton | undefined => {
    if (!raw || typeof raw !== 'object') return undefined;
    const keys: (keyof DynamicSkeleton)[] = [
      'head', 'neck', 'lShoulder', 'rShoulder', 'lElbow', 'rElbow',
      'lWrist', 'rWrist', 'lHip', 'rHip', 'lKnee', 'rKnee', 'lAnkle', 'rAnkle',
    ];
    const out: any = {};
    for (const k of keys) {
      const pt = raw[k];
      if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') return undefined;
      out[k] = {
        x: Math.min(96, Math.max(4, pt.x)),
        y: Math.min(96, Math.max(4, pt.y)),
      };
    }
    return out as DynamicSkeleton;
  };

  const poses: PoseSuggestion[] = rawPoses
    .filter((item) => item && validIds.has(String(item.poseId)))
    .slice(0, 4)
    .map((item) => ({
      poseId: String(item.poseId),
      tip:
        typeof item.tip === 'string' && item.tip.trim()
          ? item.tip.trim()
          : POSE_TEMPLATES.find((p) => p.id === item.poseId)?.defaultTip || '',
      xPercent: Math.min(82, Math.max(18, Number(item.xPercent) || 50)),
      yPercent: Math.min(78, Math.max(25, Number(item.yPercent) || 54)),
      scale: Math.min(1.3, Math.max(0.55, Number(item.scale) || 0.9)),
      flipHorizontal: Boolean(item.flipHorizontal),
      skeleton: parseSkeleton(item.skeleton),
    }));

  if (poses.length === 0) {
    poses.push({
      poseId: POSE_TEMPLATES[0].id,
      tip: POSE_TEMPLATES[0].defaultTip,
      xPercent: 50,
      yPercent: 55,
      scale: 0.9,
    });
  }

  let suggestedCrop: SuggestedCrop | undefined;
  const sc = parsed?.suggestedCrop;
  if (sc && typeof sc === 'object') {
    const xP = Math.min(45, Math.max(0, Number(sc.xPercent) || 0));
    const yP = Math.min(45, Math.max(0, Number(sc.yPercent) || 0));
    const wP = Math.min(100 - xP, Math.max(45, Number(sc.widthPercent) || 100 - xP));
    const hP = Math.min(100 - yP, Math.max(45, Number(sc.heightPercent) || 100 - yP));
    const rot = Math.min(6, Math.max(-6, Number(sc.rotateDeg) || 0));
    if (wP < 98 || hP < 98 || Math.abs(rot) >= 0.5) {
      suggestedCrop = {
        xPercent: xP,
        yPercent: yP,
        widthPercent: wP,
        heightPercent: hP,
        rotateDeg: rot,
      };
    }
  }

  const cs = parsed?.cameraSettings || {};
  return {
    lightingSummary:
      typeof parsed?.lightingSummary === 'string'
        ? parsed.lightingSummary
        : 'Ánh sáng tự nhiên cân đối.',
    angleAdvice:
      typeof parsed?.angleAdvice === 'string'
        ? parsed.angleAdvice
        : 'Giữ đường chân trời thẳng và đặt chủ thể theo tỷ lệ 1/3.',
    cameraSettings: {
      aperture: String(cs.aperture || 'f/2.8'),
      shutterSpeed: String(cs.shutterSpeed || '1/250s'),
      iso: String(cs.iso || '200'),
      whiteBalance: String(cs.whiteBalance || '5500K'),
      ev: String(cs.ev || '0 EV'),
    },
    poses,
    suggestedCrop,
  };
}

export interface GeneratePoseImageOptions {
  sceneImage: HTMLImageElement | HTMLCanvasElement;
  tip: string;
  modelGender: ModelGender;
  apiKey?: string;
}

const IMAGE_GEN_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image',
  'gemini-3.1-flash-lite-image',
];

/**
 * Cách 2: Dùng Gemini Image Generation ghép một người mẫu thật vào đúng ảnh bối cảnh
 * theo tư thế (tip) và giới tính mẫu (Nam/Nữ/Cặp đôi).
 * Lưu ý: Các model tạo ảnh của Google yêu cầu API Key đã bật Billing (trả phí).
 */
export async function generatePosePreviewImage({
  sceneImage,
  tip,
  modelGender,
  apiKey,
}: GeneratePoseImageOptions): Promise<string> {
  const key = (apiKey || getStoredApiKey()).trim();
  if (!key) {
    throw new Error(
      'Tính năng vẽ người mẫu thật yêu cầu nhập Google Gemini API Key cá nhân (đã bật Billing) trong Cài đặt.',
    );
  }

  const { base64Data, mimeType } = await createGeminiThumbnail(sceneImage, 768);
  const subjectDesc =
    modelGender === 'male'
      ? 'a stylish young Vietnamese man in casual modern outfit'
      : modelGender === 'couple'
      ? 'a stylish young Vietnamese couple in matching casual outfits'
      : 'a stylish young Vietnamese woman in casual modern outfit';

  const promptText = `Keep this exact background, furniture, perspective, and lighting completely unchanged. Naturally place ${subjectDesc} into this scene following this exact pose instruction: "${tip}". Make lighting, shadows on the floor/furniture, and proportions photorealistic so the photographer and model can use it as a pose reference.`;

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
          { text: promptText },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };

  let lastStatus = 0;
  let lastErr = '';

  for (const model of IMAGE_GEN_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      key,
    )}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          const inline = part?.inlineData || part?.inline_data;
          if (inline?.data) {
            const outMime = inline.mimeType || inline.mime_type || 'image/png';
            return `data:${outMime};base64,${inline.data}`;
          }
        }
        lastErr = 'Model không trả về dữ liệu ảnh.';
        continue;
      }

      lastStatus = res.status;
      try {
        const errJson = await res.json();
        lastErr = errJson?.error?.message || res.statusText;
      } catch {
        lastErr = res.statusText;
      }
    } catch (e: any) {
      clearTimeout(timer);
      lastErr = e?.name === 'AbortError' ? 'Quá thời gian tạo ảnh (30s).' : 'Lỗi kết nối mạng.';
    }
  }

  if (lastStatus === 429) {
    throw new Error(
      'Model vẽ người mẫu thật của Google không hỗ trợ gói Free Tier (Quota = 0). Vui lòng bật Billing (trả phí) cho Gemini API Key trong Google AI Studio để sử dụng tính năng này.',
    );
  }
  throw new Error(lastErr || 'Không thể tạo ảnh người mẫu thật.');
}
